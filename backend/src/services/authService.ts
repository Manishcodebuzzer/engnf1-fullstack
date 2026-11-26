import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client.js';
import { config } from '../config/env.js';
import { ConflictError, UnauthorizedError } from '../utils/AppError.js';
import { RegisterInput, LoginInput } from '../validators/authValidators.js';
import { sanitizeUser } from '../utils/userSanitizer.js';

const BCRYPT_SALT_ROUNDS = 12; // Cost 10+ requirement satisfied

export class AuthService {
  /**
   * Registers a new user account with role USER.
   * Public registration cannot create ADMIN accounts.
   */
  async register(input: RegisterInput) {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Check case-insensitive uniqueness before insertion
    const existing = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ConflictError('A user with this email address already exists.');
    }

    // Hash password with bcrypt cost 12
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    // Create user strictly with role USER
    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'USER', // Always USER for public registration
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate JWT with user ID and <= 24h expiration
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: '24h' }
    );

    return { user, token };
  }

  /**
   * Authenticates user credentials and generates a JWT
   */
  async login(input: LoginInput) {
    const normalizedEmail = input.email.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Generate JWT (24 hour expiration)
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: '24h' }
    );

    return {
      user: sanitizeUser(user),
      token,
    };
  }
}

export const authService = new AuthService();
