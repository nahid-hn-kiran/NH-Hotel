import { z } from 'zod';

export const triggerAgentRunSchema = z.object({
  body: z.object({
    triggerEvent: z.string().min(1, 'triggerEvent is required'),
    prompt: z.string().min(3, 'prompt must be at least 3 characters long'),
  }),
});

export const approveStepSchema = z.object({
  body: z.object({
    approved: z.boolean(),
  }),
});

export const agentValidation = {
  triggerAgentRunSchema,
  approveStepSchema,
};
