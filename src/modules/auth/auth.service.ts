import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import { AppError } from '../../shared/AppError.js';
import { UserRole } from '@prisma/client';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

const registerUser = async (payload: RegisterPayload) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new AppError(409, 'User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(payload.password, 12);

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      passwordHash: hashedPassword,
      role: UserRole.GUEST,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

const loginUser = async (payload: LoginPayload) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user || !user.passwordHash) {
    throw new AppError(401, 'Invalid email or password');
  }

  const isPasswordMatched = await bcrypt.compare(payload.password, user.passwordHash);

  if (!isPasswordMatched) {
    throw new AppError(401, 'Invalid email or password');
  }

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  await prisma.session.create({
    data: {
      token: sessionToken,
      userId: user.id,
      expiresAt,
    },
  });

  const sanitizedUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return {
    user: sanitizedUser,
    sessionToken,
    expiresAt,
  };
};

const logoutUser = async (token: string) => {
  if (!token) return;

  await prisma.session.deleteMany({
    where: { token },
  });
};

const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return user;
};

export const authService = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
};
