import { Request, Response, NextFunction } from 'express';
import { ticketService } from '../services/ticketService.js';
import { getTicketsQuerySchema } from '../validators/ticketValidators.js';

export const importTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await ticketService.importTickets(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedQuery = getTicketsQuerySchema.parse(req.query);
    const result = await ticketService.getTickets(validatedQuery);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getTicketById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    res.status(200).json(ticket);
  } catch (error) {
    next(error);
  }
};

export const updateTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Actor: use X-Agent header if supplied, otherwise fallback to authenticated user's email
    const xAgentHeader = req.headers['x-agent'];
    const actor =
      typeof xAgentHeader === 'string' && xAgentHeader.trim().length > 0
        ? xAgentHeader.trim()
        : req.user?.email || 'system';

    const updated = await ticketService.updateTicket(req.params.id, req.body, actor);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};
