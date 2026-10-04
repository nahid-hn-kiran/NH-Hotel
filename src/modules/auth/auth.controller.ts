import { Request, Response } from 'express';
import env from '../../config/env.js';
import { catchAsync } from '../../shared/catchAsync.js';
import { sendResponse } from '../../shared/sendResponse.js';
import { authService } from './auth.service.js';

const register = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: 'User registered successfully',
    data: result,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { user, sessionToken, expiresAt } = await authService.loginUser(req.body);

  res.cookie('session_token', sessionToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    expires: expiresAt,
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'User logged in successfully',
    data: {
      user,
      expiresAt,
    },
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.session_token;
  if (token) {
    await authService.logoutUser(token);
  }

  res.clearCookie('session_token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'User logged out successfully',
    data: null,
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const user = await authService.getCurrentUser(userId);

  sendResponse(res, {
    statusCode: 200,
    message: 'Current user fetched successfully',
    data: user,
  });
});

export const authController = {
  register,
  login,
  logout,
  getMe,
};
