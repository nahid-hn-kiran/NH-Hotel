import { NextFunction, Request, Response } from "express";
import { AppError } from "../shared/AppError.js";

export const notFound = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(new AppError(404, `API route not found: ${req.originalUrl}`));
};
