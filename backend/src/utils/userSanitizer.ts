/**
 * Strips sensitive fields like passwordHash from user objects before returning in API responses
 */
export const sanitizeUser = <T extends { passwordHash?: string }>(
  user: T
): Omit<T, 'passwordHash'> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};
