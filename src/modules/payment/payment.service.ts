import crypto from 'node:crypto';
import prisma from '../../config/db.js';
import env from '../../config/env.js';
import { AppError } from '../../shared/AppError.js';
import { BookingStatus, PaymentProvider, PaymentStatus, UserRole } from '@prisma/client';
import { IPaymentGatewayStrategy } from './payment.interface.js';
import { StripeGateway } from './gateways/stripe.gateway.js';
import { SSLCommerzGateway } from './gateways/sslcommerz.gateway.js';

export interface UserAuthContext {
  id: string;
  email: string;
  role: UserRole;
}

const gatewayRegistry: Record<PaymentProvider, IPaymentGatewayStrategy> = {
  [PaymentProvider.STRIPE]: new StripeGateway(),
  [PaymentProvider.SSLCOMMERZ]: new SSLCommerzGateway(),
};

const initializePayment = async (
  user: UserAuthContext,
  bookingId: string,
  provider: PaymentProvider
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      guest: true,
      room: {
        include: {
          roomType: true,
        },
      },
    },
  });

  if (!booking) {
    throw new AppError(404, 'Booking not found');
  }

  if (user.role === UserRole.GUEST && booking.guestId !== user.id) {
    throw new AppError(403, 'Forbidden: You do not own this booking');
  }

  if (booking.status !== BookingStatus.PENDING_PAYMENT) {
    throw new AppError(400, 'Booking is not pending payment');
  }

  const gateway = gatewayRegistry[provider];
  if (!gateway) {
    throw new AppError(400, `Unsupported payment provider: ${provider}`);
  }

  const initialTxId = `TX_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

  const paymentRecord = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      provider,
      transactionId: initialTxId,
      amount: booking.totalAmount,
      currency: 'USD',
      status: PaymentStatus.INITIALIZED,
    },
  });

  const successUrl = `${env.CLIENT_URL}/payments/success?booking_id=${booking.id}&tx_id=${paymentRecord.id}`;
  const failUrl = `${env.CLIENT_URL}/payments/failed?booking_id=${booking.id}`;

  const initResult = await gateway.initializePayment({
    bookingId: booking.id,
    amount: Number(booking.totalAmount),
    currency: 'USD',
    guestEmail: booking.guest.email,
    guestName: booking.guest.name || 'Valued Guest',
    successUrl,
    failUrl,
  });

  // Update payment record with the final gateway transaction ID
  await prisma.payment.update({
    where: { id: paymentRecord.id },
    data: {
      transactionId: initResult.transactionId,
    },
  });

  return initResult;
};

const handlePaymentSuccess = async (transactionId: string, providerMetadata?: any) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Find payment record by transactionId
    const payment = await tx.payment.findUnique({
      where: { transactionId },
    });

    if (!payment) {
      // Try finding by metadata bookingId if available
      const bookingId = providerMetadata?.bookingId;
      if (bookingId) {
        const altPayment = await tx.payment.findFirst({
          where: { bookingId, status: PaymentStatus.INITIALIZED },
          orderBy: { createdAt: 'desc' },
        });

        if (altPayment) {
          if (altPayment.status === PaymentStatus.SUCCESS) {
            return altPayment; // Idempotent guard
          }

          const updatedPayment = await tx.payment.update({
            where: { id: altPayment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              metadata: providerMetadata || undefined,
            },
          });

          await tx.booking.update({
            where: { id: bookingId },
            data: { status: BookingStatus.CONFIRMED },
          });

          return updatedPayment;
        }
      }

      throw new AppError(404, 'Payment record not found for transaction');
    }

    // Idempotent Guard
    if (payment.status === PaymentStatus.SUCCESS) {
      return payment;
    }

    // 2. Mark payment as SUCCESS
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        metadata: providerMetadata || undefined,
      },
    });

    // 3. Mark booking as CONFIRMED
    await tx.booking.update({
      where: { id: payment.bookingId },
      data: { status: BookingStatus.CONFIRMED },
    });

    return updatedPayment;
  });
};

const handlePaymentFailure = async (transactionId: string, reason?: string) => {
  const payment = await prisma.payment.findFirst({
    where: { transactionId },
  });

  if (!payment) return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.FAILED,
      metadata: reason ? { failureReason: reason } : undefined,
    },
  });
};

export const paymentService = {
  initializePayment,
  handlePaymentSuccess,
  handlePaymentFailure,
  gatewayRegistry,
};
