import { Router } from 'express';
import { validateRequest } from '../../shared/validateRequest.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { UserRole } from '@prisma/client';
import { bookingValidation } from './booking.validation.js';
import { bookingController } from './booking.controller.js';

const router = Router();

// Public availability check
router.get(
  '/availability',
  validateRequest(bookingValidation.checkAvailabilitySchema),
  bookingController.checkAvailability
);

// Protected Guest Booking Routes
router.post(
  '/',
  authenticate,
  validateRequest(bookingValidation.createBookingSchema),
  bookingController.createBooking
);

router.get(
  '/me',
  authenticate,
  validateRequest(bookingValidation.getUserBookingsQuerySchema),
  bookingController.getMyBookings
);

router.get('/:id', authenticate, bookingController.getBookingDetails);

router.patch('/:id/cancel', authenticate, bookingController.cancelBooking);

// Protected Staff / Admin Status Update
router.patch(
  '/:id/status',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FRONT_DESK),
  validateRequest(bookingValidation.updateBookingStatusSchema),
  bookingController.updateBookingStatus
);

export const bookingRoutes = router;
