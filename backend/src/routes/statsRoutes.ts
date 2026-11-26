import { Router } from 'express';
import * as statsController from '../controllers/statsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// All stats endpoints require authentication
router.use(authMiddleware);

// GET /api/stats - Aggregated ticket triage statistics and model agreement rate
router.get('/', statsController.getStats);

export default router;
