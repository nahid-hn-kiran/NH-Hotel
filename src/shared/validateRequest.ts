import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { AppError } from './AppError.js';

export interface FormattedZodError {
  path: string;
  message: string;
}

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });

      if (typeof parsed === 'object' && parsed !== null) {
        const parsedRecord = parsed as Record<string, unknown>;
        if ('body' in parsedRecord) req.body = parsedRecord.body;
        if ('query' in parsedRecord) req.query = parsedRecord.query as any;
        if ('params' in parsedRecord) req.params = parsedRecord.params as any;
        if ('cookies' in parsedRecord) req.cookies = parsedRecord.cookies as any;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: FormattedZodError[] = error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        return next(new AppError(400, 'Validation Error', formattedErrors));
      }
      next(error);
    }
  };
};
