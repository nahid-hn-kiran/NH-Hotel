import { Router } from 'express';
import { validateRequest } from '../../shared/validateRequest.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { UserRole } from '@prisma/client';
import { agentValidation } from './agent.validation.js';
import { agentController } from './agent.controller.js';

const router = Router();

// Trigger agent run
router.post(
  '/runs',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FRONT_DESK),
  validateRequest(agentValidation.triggerAgentRunSchema),
  agentController.triggerRun
);

// Get run details
router.get('/runs/:id', authenticate, agentController.getRun);

// Approve step
router.post(
  '/runs/:id/steps/:stepId/approve',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(agentValidation.approveStepSchema),
  agentController.approveStep
);

// SSE Stream
router.get('/runs/:id/stream', authenticate, agentController.streamRunLogs);

export const agentRoutes = router;
