import { Router } from 'express';
import { validateRequest } from '../../shared/validateRequest.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { UserRole } from '@prisma/client';
import { ragValidation } from './rag.validation.js';
import { ragController } from './rag.controller.js';

const router = Router();

// Protected Ingestion Endpoint
router.post(
  '/ingest',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(ragValidation.ingestDocumentSchema),
  ragController.ingestDocument
);

// Public AI Concierge Question Answering Endpoint
router.post(
  '/ask',
  validateRequest(ragValidation.askConciergeSchema),
  ragController.askConcierge
);

export const ragRoutes = router;
