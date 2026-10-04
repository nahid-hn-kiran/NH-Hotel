import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import { sendResponse } from './shared/sendResponse.js';
import { notFound } from './middlewares/notFound.js';
import { globalErrorHandler } from './middlewares/globalErrorHandler.js';
import { authRoutes } from './modules/auth/auth.routes.js';

const app: Express = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    message: 'Health check successful',
    data: {
      status: 'ok',
      uptime: process.uptime(),
    },
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
