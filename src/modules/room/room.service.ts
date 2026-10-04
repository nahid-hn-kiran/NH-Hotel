import prisma from '../../config/db.js';
import { AppError } from '../../shared/AppError.js';
import { Prisma, RoomStatus } from '@prisma/client';

export interface RoomTypeFilters {
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  capacity?: number;
  amenity?: string;
}

export interface CreateRoomTypePayload {
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  capacity: number;
  amenities?: string[];
  images?: string[];
}

export interface PhysicalRoomFilters {
  status?: RoomStatus;
  floor?: number;
  roomTypeId?: string;
}

export interface CreatePhysicalRoomPayload {
  roomNumber: string;
  floor: number;
  roomTypeId: string;
}

const getAllRoomTypes = async (filters: RoomTypeFilters) => {
  const page = Number(filters.page || 1);
  const limit = Number(filters.limit || 10);
  const skip = (page - 1) * limit;

  const where: Prisma.RoomTypeWhereInput = {};

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.basePrice = {};
    if (filters.minPrice !== undefined) {
      where.basePrice.gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      where.basePrice.lte = filters.maxPrice;
    }
  }

  if (filters.capacity !== undefined) {
    where.capacity = {
      gte: filters.capacity,
    };
  }

  if (filters.amenity) {
    where.amenities = {
      has: filters.amenity,
    };
  }

  const [data, total] = await Promise.all([
    prisma.roomType.findMany({
      where,
      skip,
      take: limit,
      include: {
        _count: {
          select: { rooms: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.roomType.count({ where }),
  ]);

  const totalPage = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
    data,
  };
};

const getRoomTypeBySlug = async (slug: string) => {
  const roomType = await prisma.roomType.findUnique({
    where: { slug },
    include: {
      rooms: true,
      _count: {
        select: { rooms: true },
      },
    },
  });

  if (!roomType) {
    throw new AppError(404, 'Room type not found');
  }

  return roomType;
};

const createRoomType = async (payload: CreateRoomTypePayload) => {
  const existing = await prisma.roomType.findUnique({
    where: { slug: payload.slug },
  });

  if (existing) {
    throw new AppError(409, 'Slug already exists');
  }

  const roomType = await prisma.roomType.create({
    data: {
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      basePrice: payload.basePrice,
      capacity: payload.capacity,
      amenities: payload.amenities || [],
      images: payload.images || [],
    },
  });

  return roomType;
};

const getAllPhysicalRooms = async (filters: PhysicalRoomFilters) => {
  const where: Prisma.RoomWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.floor !== undefined) {
    where.floor = Number(filters.floor);
  }

  if (filters.roomTypeId) {
    where.roomTypeId = filters.roomTypeId;
  }

  const rooms = await prisma.room.findMany({
    where,
    include: {
      roomType: true,
    },
    orderBy: { roomNumber: 'asc' },
  });

  return rooms;
};

const createPhysicalRoom = async (payload: CreatePhysicalRoomPayload) => {
  const existingRoom = await prisma.room.findUnique({
    where: { roomNumber: payload.roomNumber },
  });

  if (existingRoom) {
    throw new AppError(409, `Room number ${payload.roomNumber} already exists`);
  }

  const roomType = await prisma.roomType.findUnique({
    where: { id: payload.roomTypeId },
  });

  if (!roomType) {
    throw new AppError(404, 'Room type not found');
  }

  const room = await prisma.room.create({
    data: {
      roomNumber: payload.roomNumber,
      floor: payload.floor,
      roomTypeId: payload.roomTypeId,
    },
    include: {
      roomType: true,
    },
  });

  return room;
};

const updatePhysicalRoomStatus = async (roomId: string, status: RoomStatus) => {
  const existingRoom = await prisma.room.findUnique({
    where: { id: roomId },
  });

  if (!existingRoom) {
    throw new AppError(404, 'Room not found');
  }

  const room = await prisma.room.update({
    where: { id: roomId },
    data: { status },
    include: {
      roomType: true,
    },
  });

  return room;
};

const updateRoomType = async (id: string, payload: Partial<CreateRoomTypePayload>) => {
  const existing = await prisma.roomType.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError(404, 'Room type not found');
  }

  const roomType = await prisma.roomType.update({
    where: { id },
    data: payload,
    include: {
      _count: { select: { rooms: true } },
    },
  });

  return roomType;
};

export const roomService = {
  getAllRoomTypes,
  getRoomTypeBySlug,
  createRoomType,
  updateRoomType,
  getAllPhysicalRooms,
  createPhysicalRoom,
  updatePhysicalRoomStatus,
};
