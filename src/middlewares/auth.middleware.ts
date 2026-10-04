import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import prisma from '../config/db.js';
import { AppError } from '../shared/AppError.js';
import { catchAsync } from '../shared/catchAsync.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export const authenticate = catchAsync(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies?.session_token;

    if (!token) {
      throw new AppError(401, 'Authentication token missing');
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError(401, 'Session expired or invalid');
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };

    next();
  }
);

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'Forbidden: insufficient permissions');
    }

    next();
  };
};
