import { Router } from 'express';
import { validateRequest } from '../../shared/validateRequest.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { UserRole } from '@prisma/client';
import { roomValidation } from './room.validation.js';
import { roomController } from './room.controller.js';

const router = Router();

// Public Room Types Endpoints
router.get(
  '/types',
  validateRequest(roomValidation.getRoomTypesQuerySchema),
  roomController.getRoomTypes
);

router.get('/types/:slug', roomController.getRoomTypeDetails);

// Admin Room Type Management
router.post(
  '/types',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(roomValidation.createRoomTypeSchema),
  roomController.createRoomType
);

// Staff Physical Room Inventory Management
router.get(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FRONT_DESK, UserRole.HOUSEKEEPING),
  roomController.getRooms
);

router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(roomValidation.createRoomSchema),
  roomController.createRoom
);

router.patch(
  '/:id/status',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FRONT_DESK, UserRole.HOUSEKEEPING),
  validateRequest(roomValidation.updateRoomStatusSchema),
  roomController.updateRoomStatus
);

export const roomRoutes = router;
