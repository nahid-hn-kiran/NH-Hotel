import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync.js';
import { sendResponse } from '../../shared/sendResponse.js';
import { roomService } from './room.service.js';

const getRoomTypes = catchAsync(async (req: Request, res: Response) => {
  const result = await roomService.getAllRoomTypes(req.query);

  sendResponse(res, {
    statusCode: 200,
    message: 'Room types retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getRoomTypeDetails = catchAsync(async (req: Request, res: Response) => {
  const slug = req.params.slug as string;
  const result = await roomService.getRoomTypeBySlug(slug);

  sendResponse(res, {
    statusCode: 200,
    message: 'Room type details retrieved successfully',
    data: result,
  });
});

const createRoomType = catchAsync(async (req: Request, res: Response) => {
  const result = await roomService.createRoomType(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: 'Room type created successfully',
    data: result,
  });
});

const getRooms = catchAsync(async (req: Request, res: Response) => {
  const result = await roomService.getAllPhysicalRooms(req.query as any);

  sendResponse(res, {
    statusCode: 200,
    message: 'Physical rooms retrieved successfully',
    data: result,
  });
});

const createRoom = catchAsync(async (req: Request, res: Response) => {
  const result = await roomService.createPhysicalRoom(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: 'Physical room created successfully',
    data: result,
  });
});

const updateRoomStatus = catchAsync(async (req: Request, res: Response) => {
  const roomId = req.params.id as string;
  const { status } = req.body;
  const result = await roomService.updatePhysicalRoomStatus(roomId, status);

  sendResponse(res, {
    statusCode: 200,
    message: 'Room status updated successfully',
    data: result,
  });
});

const updateRoomType = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await roomService.updateRoomType(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    message: 'Room type updated successfully',
    data: result,
  });
});

export const roomController = {
  getRoomTypes,
  getRoomTypeDetails,
  createRoomType,
  updateRoomType,
  getRooms,
  createRoom,
  updateRoomStatus,
};
