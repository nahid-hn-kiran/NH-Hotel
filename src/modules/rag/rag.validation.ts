import { z } from 'zod';

export const ingestDocumentSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters long'),
    content: z.string().min(20, 'Content must be at least 20 characters long'),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const askConciergeSchema = z.object({
  body: z.object({
    query: z
      .string()
      .min(3, 'Query must be at least 3 characters long')
      .max(500, 'Query cannot exceed 500 characters'),
  }),
});

export const ragValidation = {
  ingestDocumentSchema,
  askConciergeSchema,
};
