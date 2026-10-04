import Stripe from 'stripe';
import env from '../../../config/env.js';
import {
  IPaymentGatewayStrategy,
  IPaymentInitOptions,
  IPaymentInitResult,
  IPaymentWebhookResult,
} from '../payment.interface.js';

export class StripeGateway implements IPaymentGatewayStrategy {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }

  async initializePayment(options: IPaymentInitOptions): Promise<IPaymentInitResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: options.guestEmail,
      client_reference_id: options.bookingId,
      metadata: {
        bookingId: options.bookingId,
      },
      line_items: [
        {
          price_data: {
            currency: options.currency.toLowerCase(),
            product_data: {
              name: `Hotel Booking Reservation #${options.bookingId}`,
            },
            unit_amount: Math.round(options.amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: options.successUrl,
      cancel_url: options.failUrl,
    });

    return {
      paymentGatewayUrl: session.url || `${env.CLIENT_URL}/payments/success?session_id=${session.id}`,
      transactionId: session.id,
    };
  }

  async verifyWebhook(payload: any, signature?: string): Promise<IPaymentWebhookResult> {
    let event: Stripe.Event;

    if (signature && env.STRIPE_WEBHOOK_SECRET !== 'whsec_placeholder') {
      try {
        event = this.stripe.webhooks.constructEvent(
          payload,
          signature,
          env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err: any) {
        throw new Error(`Stripe Webhook Signature Verification Failed: ${err.message}`);
      }
    } else {
      event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        transactionId: session.id,
        isSuccess: true,
        bookingId: (session.client_reference_id || session.metadata?.bookingId) as string,
        metadata: session.metadata as Record<string, unknown>,
      };
    }

    return {
      transactionId: (event.data.object as any)?.id || 'unknown',
      isSuccess: false,
    };
  }
}
