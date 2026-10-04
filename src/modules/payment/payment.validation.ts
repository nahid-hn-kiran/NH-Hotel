import { z } from 'zod';
import { PaymentProvider } from '@prisma/client';

export const initPaymentSchema = z.object({
  body: z.object({
    bookingId: z.string().min(1, 'bookingId is required'),
    provider: z.nativeEnum(PaymentProvider),
  }),
});

export const paymentValidation = {
  initPaymentSchema,
};
