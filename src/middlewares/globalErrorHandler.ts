import { Prisma } from "@prisma/client";
import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import env from "../config/env.js";

export const globalErrorHandler: ErrorRequestHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || undefined;

  // Handle Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError || err?.code) {
    if (err.code === "P2002") {
      statusCode = 409;
      const target = Array.isArray(err.meta?.target)
        ? err.meta.target.join(", ")
        : "field";
      message = `Duplicate key error: Unique constraint failed on ${target}`;
    } else if (err.code === "P2025") {
      statusCode = 404;
      message = (err.meta?.cause as string) || "Record not found";
    }
  }

  // Handle Zod Error if directly passed
  if (err?.name === "ZodError") {
    statusCode = 400;
    message = "Validation Error";
    errors = err.issues?.map((issue: any) => ({
      path: Array.isArray(issue.path) ? issue.path.join(".") : "",
      message: issue.message,
    }));
  }

  res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    ...(errors !== undefined && { errors }),
    ...(env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
