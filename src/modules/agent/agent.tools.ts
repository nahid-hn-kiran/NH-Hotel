import { z, ZodObject } from 'zod';
import prisma from '../../config/db.js';
import { BookingStatus, RoomStatus } from '@prisma/client';

export interface AgentTool {
  name: string;
  description: string;
  parameters: ZodObject<any>;
  requiresApproval: boolean;
  execute: (args: any, context?: any) => Promise<Record<string, unknown> | any>;
}

// 1. check_room_availability tool
const checkRoomAvailabilityTool: AgentTool = {
  name: 'check_room_availability',
  description: 'Checks physical room availability for specified check-in and check-out dates and optional room type.',
  requiresApproval: false,
  parameters: z.object({
    checkInDate: z.string().describe('Check-in date in YYYY-MM-DD format'),
    checkOutDate: z.string().describe('Check-out date in YYYY-MM-DD format'),
    roomTypeId: z.string().optional().describe('Optional RoomType ID filter'),
  }),
  execute: async (args: { checkInDate: string; checkOutDate: string; roomTypeId?: string }) => {
    const checkIn = new Date(args.checkInDate);
    const checkOut = new Date(args.checkOutDate);

    const availableRooms = await prisma.room.findMany({
      where: {
        status: {
          not: RoomStatus.OUT_OF_SERVICE,
        },
        ...(args.roomTypeId && { roomTypeId: args.roomTypeId }),
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
      select: {
        id: true,
        roomNumber: true,
        floor: true,
        status: true,
        roomTypeId: true,
      },
    });

    return {
      availableCount: availableRooms.length,
      availableRooms,
    };
  },
};

// 2. assign_housekeeping_task tool
const assignHousekeepingTaskTool: AgentTool = {
  name: 'assign_housekeeping_task',
  description: 'Creates a housekeeping task for a specific room and assigns priority (Human-in-the-loop approval required).',
  requiresApproval: true,
  parameters: z.object({
    roomId: z.string().describe('ID of the physical room to clean/inspect'),
    priority: z.number().int().min(1).max(3).describe('Task priority (1 = High, 2 = Medium, 3 = Low)'),
    assignedToId: z.string().optional().describe('Optional ID of housekeeping staff user'),
  }),
  execute: async (args: { roomId: string; priority: number; assignedToId?: string }) => {
    const room = await prisma.room.findUnique({
      where: { id: args.roomId },
    });

    if (!room) {
      throw new Error(`Room with ID ${args.roomId} not found`);
    }

    const task = await prisma.housekeepingTask.create({
      data: {
        roomId: args.roomId,
        priority: args.priority,
        assignedToId: args.assignedToId || null,
        isCompleted: false,
      },
    });

    if (room.status === RoomStatus.VACANT_CLEAN) {
      await prisma.room.update({
        where: { id: args.roomId },
        data: { status: RoomStatus.VACANT_DIRTY },
      });
    }

    return {
      taskId: task.id,
      status: 'ASSIGNED',
      roomId: args.roomId,
      priority: args.priority,
    };
  },
};

// 3. calculate_rate_delta tool
const calculateRateDeltaTool: AgentTool = {
  name: 'calculate_rate_delta',
  description: 'Calculates price difference per night and total delta between two room types for upgrade/downgrade evaluation.',
  requiresApproval: false,
  parameters: z.object({
    currentRoomTypeId: z.string().describe('ID of current room type'),
    targetRoomTypeId: z.string().describe('ID of target upgrade/downgrade room type'),
    nights: z.number().int().min(1).describe('Number of stay nights'),
  }),
  execute: async (args: { currentRoomTypeId: string; targetRoomTypeId: string; nights: number }) => {
    const [currentRt, targetRt] = await Promise.all([
      prisma.roomType.findUnique({ where: { id: args.currentRoomTypeId } }),
      prisma.roomType.findUnique({ where: { id: args.targetRoomTypeId } }),
    ]);

    if (!currentRt || !targetRt) {
      throw new Error('One or both room types were not found');
    }

    const currentPricePerNight = Number(currentRt.basePrice);
    const targetPricePerNight = Number(targetRt.basePrice);
    const priceDelta = targetPricePerNight - currentPricePerNight;
    const totalDelta = priceDelta * args.nights;

    return {
      currentPricePerNight,
      targetPricePerNight,
      priceDelta,
      totalDelta,
    };
  },
};

export const agentTools: Record<string, AgentTool> = {
  check_room_availability: checkRoomAvailabilityTool,
  assign_housekeeping_task: assignHousekeepingTaskTool,
  calculate_rate_delta: calculateRateDeltaTool,
};

export const getOpenAIToolSpecs = () => {
  return [
    {
      type: 'function' as const,
      function: {
        name: 'check_room_availability',
        description: 'Checks physical room availability for specified check-in and check-out dates.',
        parameters: {
          type: 'object',
          properties: {
            checkInDate: { type: 'string', description: 'Check-in date YYYY-MM-DD' },
            checkOutDate: { type: 'string', description: 'Check-out date YYYY-MM-DD' },
            roomTypeId: { type: 'string', description: 'Optional RoomType ID filter' },
          },
          required: ['checkInDate', 'checkOutDate'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'assign_housekeeping_task',
        description: 'Creates a housekeeping task for a room (Requires Human Approval).',
        parameters: {
          type: 'object',
          properties: {
            roomId: { type: 'string', description: 'Physical room ID' },
            priority: { type: 'number', description: 'Priority 1-3' },
            assignedToId: { type: 'string', description: 'Optional staff user ID' },
          },
          required: ['roomId', 'priority'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'calculate_rate_delta',
        description: 'Calculates price delta between room types for upgrade calculation.',
        parameters: {
          type: 'object',
          properties: {
            currentRoomTypeId: { type: 'string', description: 'Current RoomType ID' },
            targetRoomTypeId: { type: 'string', description: 'Target RoomType ID' },
            nights: { type: 'number', description: 'Number of stay nights' },
          },
          required: ['currentRoomTypeId', 'targetRoomTypeId', 'nights'],
        },
      },
    },
  ];
};
