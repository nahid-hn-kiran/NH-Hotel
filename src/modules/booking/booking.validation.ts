import { z } from 'zod';
import { BookingStatus } from '@prisma/client';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const checkAvailabilitySchema = z.object({
  query: z
    .object({
      checkInDate: z.string().regex(dateRegex, 'checkInDate must be in YYYY-MM-DD format'),
      checkOutDate: z.string().regex(dateRegex, 'checkOutDate must be in YYYY-MM-DD format'),
      roomTypeId: z.string().optional(),
    })
    .refine(
      (data) => {
        const inDate = new Date(data.checkInDate);
        const outDate = new Date(data.checkOutDate);
        return outDate > inDate;
      },
      {
        message: 'checkOutDate must be after checkInDate',
        path: ['checkOutDate'],
      }
    )
    .refine(
      (data) => {
        const inDate = new Date(data.checkInDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return inDate >= today;
      },
      {
        message: 'checkInDate cannot be in the past',
        path: ['checkInDate'],
      }
    ),
});

export const createBookingSchema = z.object({
  body: z
    .object({
      roomTypeId: z.string().min(1, 'roomTypeId is required'),
      checkInDate: z.string().regex(dateRegex, 'checkInDate must be in YYYY-MM-DD format'),
      checkOutDate: z.string().regex(dateRegex, 'checkOutDate must be in YYYY-MM-DD format'),
    })
    .refine(
      (data) => {
        const inDate = new Date(data.checkInDate);
        const outDate = new Date(data.checkOutDate);
        return outDate > inDate;
      },
      {
        message: 'checkOutDate must be after checkInDate',
        path: ['checkOutDate'],
      }
    ),
});

export const updateBookingStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(BookingStatus),
  }),
});

export const getUserBookingsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(50).optional().default(10),
  }),
});

export const bookingValidation = {
  checkAvailabilitySchema,
  createBookingSchema,
  updateBookingStatusSchema,
  getUserBookingsQuerySchema,
};
