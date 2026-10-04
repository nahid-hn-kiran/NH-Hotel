import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync.js';
import { sendResponse } from '../../shared/sendResponse.js';
import { bookingService } from './booking.service.js';

const checkAvailability = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingService.checkRoomAvailability(req.query as any);

  sendResponse(res, {
    statusCode: 200,
    message: 'Room availability checked successfully',
    data: result,
  });
});

const createBooking = catchAsync(async (req: Request, res: Response) => {
  const guestId = req.user!.id;
  const result = await bookingService.createBooking(guestId, req.body);

  sendResponse(res, {
    statusCode: 201,
    message: 'Booking created successfully',
    data: result,
  });
});

const getMyBookings = catchAsync(async (req: Request, res: Response) => {
  const guestId = req.user!.id;
  const result = await bookingService.getMyBookings(guestId, req.query);

  sendResponse(res, {
    statusCode: 200,
    message: 'Bookings retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getBookingDetails = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id as string;
  const result = await bookingService.getBookingById(bookingId, req.user!);

  sendResponse(res, {
    statusCode: 200,
    message: 'Booking details retrieved successfully',
    data: result,
  });
});

const cancelBooking = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id as string;
  const result = await bookingService.cancelBooking(bookingId, req.user!);

  sendResponse(res, {
    statusCode: 200,
    message: 'Booking cancelled successfully',
    data: result,
  });
});

const updateBookingStatus = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id as string;
  const { status } = req.body;
  const result = await bookingService.updateBookingStatus(bookingId, status);

  sendResponse(res, {
    statusCode: 200,
    message: 'Booking status updated successfully',
    data: result,
  });
});

const getAllBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingService.getAllBookings(req.query as any);

  sendResponse(res, {
    statusCode: 200,
    message: 'All bookings retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const bookingController = {
  checkAvailability,
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingDetails,
  cancelBooking,
  updateBookingStatus,
};
