import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync.js';
import { sendResponse } from '../../shared/sendResponse.js';
import { paymentService } from './payment.service.js';

const initPayment = catchAsync(async (req: Request, res: Response) => {
  const { bookingId, provider } = req.body;
  const result = await paymentService.initializePayment(req.user!, bookingId, provider);

  sendResponse(res, {
    statusCode: 200,
    message: 'Payment session initialized successfully',
    data: result,
  });
});

const stripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  const payload = (req as any).rawBody || req.body;

  const webhookResult = await paymentService.gatewayRegistry.STRIPE.verifyWebhook(
    payload,
    signature
  );

  if (webhookResult.isSuccess && webhookResult.transactionId) {
    await paymentService.handlePaymentSuccess(
      webhookResult.transactionId,
      webhookResult.metadata
    );
  } else if (!webhookResult.isSuccess && webhookResult.transactionId) {
    await paymentService.handlePaymentFailure(webhookResult.transactionId, 'Stripe Payment Failed');
  }

  res.status(200).json({ received: true });
});

const sslcommerzIpn = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  const webhookResult = await paymentService.gatewayRegistry.SSLCOMMERZ.verifyWebhook(payload);

  if (webhookResult.isSuccess && webhookResult.transactionId) {
    await paymentService.handlePaymentSuccess(
      webhookResult.transactionId,
      webhookResult.metadata
    );
  } else if (!webhookResult.isSuccess && webhookResult.transactionId) {
    await paymentService.handlePaymentFailure(
      webhookResult.transactionId,
      'SSLCommerz Validation Failed'
    );
  }

  res.status(200).json({ status: 'ACCEPTED' });
});

export const paymentController = {
  initPayment,
  stripeWebhook,
  sslcommerzIpn,
};
