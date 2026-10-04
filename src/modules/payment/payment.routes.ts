import express, { Router } from 'express';
import { validateRequest } from '../../shared/validateRequest.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { paymentValidation } from './payment.validation.js';
import { paymentController } from './payment.controller.js';

const router = Router();

// Protected Payment Initialization
router.post(
  '/init',
  authenticate,
  validateRequest(paymentValidation.initPaymentSchema),
  paymentController.initPayment
);

// Public Webhook / IPN Endpoints
router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  paymentController.stripeWebhook
);

router.post('/webhook/sslcommerz', paymentController.sslcommerzIpn);
router.get('/webhook/sslcommerz/success', paymentController.sslcommerzSuccessCallback);
router.post('/webhook/sslcommerz/success', paymentController.sslcommerzSuccessCallback);
router.get('/webhook/sslcommerz/fail', paymentController.sslcommerzFailCallback);
router.post('/webhook/sslcommerz/fail', paymentController.sslcommerzFailCallback);

export const paymentRoutes = router;
