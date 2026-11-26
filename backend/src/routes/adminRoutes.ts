import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';

const router = Router();

// All admin endpoints require authentication and ADMIN role
router.use(authMiddleware);
router.use(requireAdmin);

// GET /api/admin/stats - Admin overview dashboard statistics
router.get('/stats', adminController.getAdminStats);

export default router;
