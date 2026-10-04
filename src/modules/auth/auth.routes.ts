import { Router } from 'express';
import { validateRequest } from '../../shared/validateRequest.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authValidation } from './auth.validation.js';
import { authController } from './auth.controller.js';

const router = Router();

router.post('/register', validateRequest(authValidation.registerSchema), authController.register);
router.post('/login', validateRequest(authValidation.loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

export const authRoutes = router;
