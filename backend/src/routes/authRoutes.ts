import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { registerSchema, loginSchema } from '../validators/authValidators.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);

// Protected Authentication Endpoints
router.get('/me', authMiddleware, authController.getMe);

// Role-protected verification endpoint for RBAC testing
router.get('/admin-test', authMiddleware, requireAdmin, (req, res) => {
  res.status(200).json({
    message: 'Admin authorization verified successfully.',
    user: req.user,
  });
});

export default router;
