import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import { sendResponse } from './shared/sendResponse.js';
import { notFound } from './middlewares/notFound.js';
import { globalErrorHandler } from './middlewares/globalErrorHandler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { roomRoutes } from './modules/room/room.routes.js';
import { bookingRoutes } from './modules/booking/booking.routes.js';
import { paymentRoutes } from './modules/payment/payment.routes.js';
import { ragRoutes } from './modules/rag/rag.routes.js';
import { agentRoutes } from './modules/agent/agent.routes.js';

const app: Express = express();

app.use(helmet());

const allowedOrigins = Array.from(
  new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    env.CORS_ORIGIN,
  ].filter(Boolean))
);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  })
);

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', service: 'nh-hotel-backend', timestamp: new Date().toISOString() });
});

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', service: 'nh-hotel-backend', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/rag', ragRoutes);
app.use('/api/v1/agent', agentRoutes);

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
