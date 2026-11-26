import { Request, Response, NextFunction } from 'express';
import { resourceService } from '../services/resourceService.js';
import {
  listResourcesQuerySchema,
  getAvailabilityQuerySchema,
} from '../validators/resourceValidators.js';

export const listResources = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedQuery = listResourcesQuerySchema.parse(req.query);
    const result = await resourceService.listResources(validatedQuery, req.user?.role);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getResourceById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const resource = await resourceService.getResourceById(req.params.id, req.user?.role);
    res.status(200).json(resource);
  } catch (error) {
    next(error);
  }
};

export const createResource = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const resource = await resourceService.createResource(req.body);
    res.status(201).json(resource);
  } catch (error) {
    next(error);
  }
};

export const updateResource = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const resource = await resourceService.updateResource(req.params.id, req.body);
    res.status(200).json(resource);
  } catch (error) {
    next(error);
  }
};

export const getResourceAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedQuery = getAvailabilityQuerySchema.parse(req.query);
    const result = await resourceService.getResourceAvailability(
      req.params.id,
      validatedQuery.from,
      validatedQuery.to,
      req.user?.role
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
