import crypto from 'node:crypto';
import prisma from '../../config/db.js';
import { AppError } from '../../shared/AppError.js';
import { BookingStatus, RoomStatus, UserRole } from '@prisma/client';

export interface CheckAvailabilityParams {
  checkInDate: string;
  checkOutDate: string;
  roomTypeId?: string;
}

export interface CreateBookingPayload {
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
}

export interface UserAuthContext {
  id: string;
  email: string;
  role: UserRole;
}

const generateBookingCode = (): string => {
  return `BK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

const checkRoomAvailability = async (params: CheckAvailabilityParams) => {
  const checkIn = new Date(params.checkInDate);
  const checkOut = new Date(params.checkOutDate);

  const availableRooms = await prisma.room.findMany({
    where: {
      status: {
        not: RoomStatus.OUT_OF_SERVICE,
      },
      ...(params.roomTypeId && { roomTypeId: params.roomTypeId }),
      bookings: {
        none: {
          status: {
            not: BookingStatus.CANCELLED,
          },
          checkInDate: {
            lt: checkOut,
          },
          checkOutDate: {
            gt: checkIn,
          },
        },
      },
    },
    include: {
      roomType: true,
    },
    orderBy: { roomNumber: 'asc' },
  });

  return availableRooms;
};

const createBooking = async (guestId: string, payload: CreateBookingPayload) => {
  const checkIn = new Date(payload.checkInDate);
  const checkOut = new Date(payload.checkOutDate);

  const diffTime = checkOut.getTime() - checkIn.getTime();
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (nights < 1) {
    throw new AppError(400, 'Minimum stay is 1 night');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch RoomType
    const roomType = await tx.roomType.findUnique({
      where: { id: payload.roomTypeId },
    });

    if (!roomType) {
      throw new AppError(404, 'Room type not found');
    }

    // 2. Find an available physical room for this type
    const availableRoom = await tx.room.findFirst({
      where: {
        roomTypeId: payload.roomTypeId,
        status: {
          not: RoomStatus.OUT_OF_SERVICE,
        },
        bookings: {
          none: {
            status: {
              not: BookingStatus.CANCELLED,
            },
            checkInDate: {
              lt: checkOut,
            },
            checkOutDate: {
              gt: checkIn,
            },
          },
        },
      },
    });

    if (!availableRoom) {
      throw new AppError(409, 'No rooms available for the selected dates');
    }

    // 3. Calculate total amount
    const totalAmount = Number(roomType.basePrice) * nights;
    const bookingCode = generateBookingCode();

    // 4. Create Booking
    const booking = await tx.booking.create({
      data: {
        bookingCode,
        guestId,
        roomId: availableRoom.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        totalAmount,
        status: BookingStatus.PENDING_PAYMENT,
      },
      include: {
        room: {
          include: {
            roomType: true,
          },
        },
        guest: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return booking;
  });
};

const getMyBookings = async (guestId: string, query: { page?: number; limit?: number }) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.booking.findMany({
      where: { guestId },
      skip,
      take: limit,
      include: {
        room: {
          include: {
            roomType: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.count({ where: { guestId } }),
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

const getBookingById = async (bookingId: string, user: UserAuthContext) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      room: {
        include: {
          roomType: true,
        },
      },
      guest: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      payments: true,
    },
  });

  if (!booking) {
    throw new AppError(404, 'Booking not found');
  }

  if (user.role === UserRole.GUEST && booking.guestId !== user.id) {
    throw new AppError(403, 'Forbidden: You do not have access to this booking');
  }

  return booking;
};

const cancelBooking = async (bookingId: string, user: UserAuthContext) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new AppError(404, 'Booking not found');
  }

  if (user.role === UserRole.GUEST && booking.guestId !== user.id) {
    throw new AppError(403, 'Forbidden: You cannot cancel this booking');
  }

  if (
    booking.status === BookingStatus.CHECKED_IN ||
    booking.status === BookingStatus.CHECKED_OUT ||
    booking.status === BookingStatus.CANCELLED
  ) {
    throw new AppError(400, 'Booking cannot be cancelled in its current state');
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: BookingStatus.CANCELLED },
    include: {
      room: {
        include: {
          roomType: true,
        },
      },
    },
  });

  return updatedBooking;
};

const updateBookingStatus = async (bookingId: string, status: BookingStatus) => {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new AppError(404, 'Booking not found');
    }

    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        room: {
          include: {
            roomType: true,
          },
        },
      },
    });

    // Update physical room status based on booking status transition
    if (status === BookingStatus.CHECKED_IN) {
      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: RoomStatus.OCCUPIED },
      });
    } else if (status === BookingStatus.CHECKED_OUT) {
      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: RoomStatus.VACANT_DIRTY },
      });

      // Create housekeeping task for dirty room
      await tx.housekeepingTask.create({
        data: {
          roomId: booking.roomId,
          priority: 1,
          isCompleted: false,
        },
      });
    }

    return updatedBooking;
  });
};

export const bookingService = {
  checkRoomAvailability,
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  updateBookingStatus,
};
