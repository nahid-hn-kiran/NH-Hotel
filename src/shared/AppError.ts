export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: Record<string, unknown> | Array<unknown>;

  constructor(
    statusCode: number,
    message: string,
    errors?: Record<string, unknown> | Array<unknown>,
    isOperational = true,
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
