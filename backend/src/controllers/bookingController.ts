import { Request, Response, NextFunction } from 'express';
import { bookingService } from '../services/bookingService.js';
import {
  myBookingsQuerySchema,
  listBookingsQuerySchema,
  rejectBookingSchema,
} from '../validators/bookingValidators.js';
import { prisma } from '../prisma/client.js';
import { NotFoundError, UnauthorizedError } from '../utils/AppError.js';

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    const result = await bookingService.createBooking(req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    const query = myBookingsQuerySchema.parse(req.query);
    const result = await bookingService.getMyBookings(req.user.id, query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    const result = await bookingService.getBookingById(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const listBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = listBookingsQuerySchema.parse(req.query);
    const result = await bookingService.listBookings(query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    const result = await bookingService.cancelBooking(req.params.id, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const approveBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await bookingService.approveBooking(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const rejectBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Preserve required error check order: 404 path ID before 400 validation
    const existing = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      throw new NotFoundError(`Booking '${req.params.id}' not found`);
    }

    const validated = rejectBookingSchema.parse(req.body);
    const result = await bookingService.rejectBooking(req.params.id, validated.note);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
