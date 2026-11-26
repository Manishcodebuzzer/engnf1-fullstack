import { Router } from 'express';
import * as ticketController from '../controllers/ticketController.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { importTicketsSchema, updateTicketSchema } from '../validators/ticketValidators.js';

const router = Router();

// All ticket endpoints require authentication
router.use(authMiddleware);

// POST /api/tickets/import - Import tickets with auto-classification
router.post('/import', validateBody(importTicketsSchema), ticketController.importTickets);

// GET /api/tickets - List tickets with composite filters and search
router.get('/', ticketController.getTickets);

// GET /api/tickets/:id - Get ticket details with audit events and assignee
router.get('/:id', ticketController.getTicketById);

// PATCH /api/tickets/:id - Update ticket fields and create audit events
router.patch('/:id', validateBody(updateTicketSchema), ticketController.updateTicket);

export default router;
