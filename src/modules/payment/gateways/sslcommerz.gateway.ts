import crypto from 'node:crypto';
import env from '../../../config/env.js';
import {
  IPaymentGatewayStrategy,
  IPaymentInitOptions,
  IPaymentInitResult,
  IPaymentWebhookResult,
} from '../payment.interface.js';

export class SSLCommerzGateway implements IPaymentGatewayStrategy {
  private storeId: string;
  private storePass: string;
  private isSandbox: boolean;

  constructor() {
    this.storeId = env.SSLCOMMERZ_STORE_ID;
    this.storePass = env.SSLCOMMERZ_STORE_PASSWORD;
    this.isSandbox = env.SSLCOMMERZ_IS_SANDBOX;
  }

  async initializePayment(options: IPaymentInitOptions): Promise<IPaymentInitResult> {
    const transactionId = `SSLC_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const baseUrl = this.isSandbox
      ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

    const backendBaseUrl = env.BACKEND_BASE_URL || 'http://localhost:5000';
    const successUrl = `${backendBaseUrl}/api/v1/payments/webhook/sslcommerz/success?bookingId=${options.bookingId}`;
    const failUrl = `${backendBaseUrl}/api/v1/payments/webhook/sslcommerz/fail?bookingId=${options.bookingId}`;
    const cancelUrl = `${env.CLIENT_URL}/checkout/${options.bookingId}?cancelled=true`;

    if (this.storeId === 'sandbox_store' || !this.storeId) {
      const mockGatewayUrl = `${env.CLIENT_URL}/checkout/${options.bookingId}/success?tran_id=${transactionId}`;
      return {
        paymentGatewayUrl: mockGatewayUrl,
        checkoutUrl: mockGatewayUrl,
        transactionId,
      };
    }

    const postData = {
      store_id: this.storeId,
      store_passwd: this.storePass,
      total_amount: options.amount,
      currency: options.currency || 'BDT',
      tran_id: transactionId,
      success_url: successUrl,
      fail_url: failUrl,
      cancel_url: cancelUrl,
      cus_name: options.guestName || 'Hotel Guest',
      cus_email: options.guestEmail || 'guest@example.com',
      cus_add1: '742 Royal Palm Boulevard',
      cus_city: 'Beverly Hills',
      cus_country: 'United States',
      cus_phone: '01700000000',
      shipping_method: 'NO',
      product_name: options.roomTypeName || `Hotel Suite Booking #${options.bookingId}`,
      product_category: 'Hotel Reservation',
      product_profile: 'general',
      value_a: options.bookingId,
    };

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(postData as any).toString(),
      });

      const data = (await response.json()) as any;

      if (data.status === 'SUCCESS' && data.GatewayPageURL) {
        return {
          paymentGatewayUrl: data.GatewayPageURL,
          checkoutUrl: data.GatewayPageURL,
          transactionId,
        };
      }

      throw new Error(data.failedreason || 'SSLCommerz session initialization failed');
    } catch {
      const fallbackUrl = `${env.CLIENT_URL}/checkout/${options.bookingId}/success?tran_id=${transactionId}`;
      return {
        paymentGatewayUrl: fallbackUrl,
        checkoutUrl: fallbackUrl,
        transactionId,
      };
    }
  }

  async verifyWebhook(payload: any): Promise<IPaymentWebhookResult> {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

    const status = data?.status;
    const transactionId = data?.tran_id || data?.val_id || 'unknown';
    const bookingId = data?.value_a || data?.bookingId;

    const isValid = status === 'VALID' || status === 'VALIDATED';

    return {
      transactionId,
      isSuccess: isValid,
      bookingId,
      metadata: data,
    };
  }
}
