import { z } from 'zod';
import { RoomStatus } from '@prisma/client';

export const getRoomTypesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(50).optional().default(10),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    capacity: z.coerce.number().min(1).optional(),
    amenity: z.string().optional(),
  }),
});

export const createRoomTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required'),
    description: z.string().optional(),
    basePrice: z.number().positive('Base price must be greater than 0'),
    capacity: z.number().int().min(1, 'Capacity must be at least 1'),
    amenities: z.array(z.string()).default([]),
    images: z.array(z.string()).default([]),
  }),
});

export const createRoomSchema = z.object({
  body: z.object({
    roomNumber: z.string().min(1, 'Room number is required'),
    floor: z.number().int('Floor must be an integer'),
    roomTypeId: z.string().min(1, 'Room type ID is required'),
  }),
});

export const updateRoomStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(RoomStatus),
  }),
});

export const roomValidation = {
  getRoomTypesQuerySchema,
  createRoomTypeSchema,
  createRoomSchema,
  updateRoomStatusSchema,
};
