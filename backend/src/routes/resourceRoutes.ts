import { Router } from 'express';
import * as resourceController from '../controllers/resourceController.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import {
  createResourceSchema,
  updateResourceSchema,
} from '../validators/resourceValidators.js';

const router = Router();

// All resource endpoints require authentication
router.use(authMiddleware);

// GET /api/resources - List resources (active only for USER, all for ADMIN)
router.get('/', resourceController.listResources);

// GET /api/resources/:id - Resource details (inactive returns 404 for USER)
router.get('/:id', resourceController.getResourceById);

// GET /api/resources/:id/availability - Availability check with privacy protection
router.get('/:id/availability', resourceController.getResourceAvailability);

// POST /api/resources - Create resource (ADMIN only)
router.post(
  '/',
  requireAdmin,
  validateBody(createResourceSchema),
  resourceController.createResource
);

// PATCH /api/resources/:id - Update resource (ADMIN only)
router.patch(
  '/:id',
  requireAdmin,
  validateBody(updateResourceSchema),
  resourceController.updateResource
);

export default router;
