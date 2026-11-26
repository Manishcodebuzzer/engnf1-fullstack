import { Router } from 'express';
import * as bookingController from '../controllers/bookingController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { createBookingSchema } from '../validators/bookingValidators.js';

const router = Router();

// All booking endpoints require authentication
router.use(authMiddleware);

// POST /api/bookings - Create booking (USER or ADMIN)
router.post('/', validateBody(createBookingSchema), bookingController.createBooking);

// GET /api/bookings/mine - Authenticated user's bookings (MUST be before /:id)
router.get('/mine', bookingController.getMyBookings);

// GET /api/bookings - List all bookings (ADMIN only)
router.get('/', requireAdmin, bookingController.listBookings);

// GET /api/bookings/:id - Booking details (Owner or ADMIN)
router.get('/:id', bookingController.getBookingById);

// PATCH /api/bookings/:id/cancel - Cancel booking (Owner only)
router.patch('/:id/cancel', bookingController.cancelBooking);

// PATCH /api/bookings/:id/approve - Approve booking (ADMIN only)
router.patch('/:id/approve', requireAdmin, bookingController.approveBooking);

// PATCH /api/bookings/:id/reject - Reject booking (ADMIN only)
router.patch('/:id/reject', requireAdmin, bookingController.rejectBooking);

export default router;
