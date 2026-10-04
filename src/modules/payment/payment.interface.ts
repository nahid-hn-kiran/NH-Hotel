export interface IPaymentInitOptions {
  bookingId: string;
  amount: number;
  currency: string;
  guestEmail: string;
  guestName: string;
  successUrl: string;
  failUrl: string;
  roomTypeName?: string;
}

export interface IPaymentInitResult {
  paymentGatewayUrl: string;
  checkoutUrl?: string;
  transactionId: string;
}

export interface IPaymentWebhookResult {
  transactionId: string;
  isSuccess: boolean;
  bookingId?: string;
  metadata?: Record<string, unknown>;
}

export interface IPaymentGatewayStrategy {
  initializePayment(options: IPaymentInitOptions): Promise<IPaymentInitResult>;
  verifyWebhook(payload: unknown, signature?: string): Promise<IPaymentWebhookResult>;
}
