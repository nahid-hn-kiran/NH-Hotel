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

    if (this.storeId === 'sandbox_store') {
      const mockGatewayUrl = `${env.CLIENT_URL}/payments/mock-sslcommerz?tran_id=${transactionId}&booking_id=${options.bookingId}&amount=${options.amount}`;
      return {
        paymentGatewayUrl: mockGatewayUrl,
        transactionId,
      };
    }

    const postData = {
      store_id: this.storeId,
      store_passwd: this.storePass,
      total_amount: options.amount,
      currency: options.currency || 'BDT',
      tran_id: transactionId,
      success_url: options.successUrl,
      fail_url: options.failUrl,
      cancel_url: options.failUrl,
      cus_name: options.guestName,
      cus_email: options.guestEmail,
      cus_add1: 'Hotel Guest Address',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: '01700000000',
      shipping_method: 'NO',
      product_name: `Hotel Booking #${options.bookingId}`,
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
          transactionId,
        };
      }

      throw new Error(data.failedreason || 'SSLCommerz session initialization failed');
    } catch {
      return {
        paymentGatewayUrl: `${env.CLIENT_URL}/payments/mock-sslcommerz?tran_id=${transactionId}&booking_id=${options.bookingId}&amount=${options.amount}`,
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
