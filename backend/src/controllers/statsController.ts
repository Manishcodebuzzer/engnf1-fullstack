import { Request, Response, NextFunction } from 'express';
import { ticketService } from '../services/ticketService.js';

export const getStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await ticketService.getTicketStats();
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};
