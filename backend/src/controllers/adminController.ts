import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/adminService.js';

export const getAdminStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await adminService.getAdminStats();
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};
