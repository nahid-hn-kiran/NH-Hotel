import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  STRIPE_SECRET_KEY: z.string().default('sk_test_placeholder'),
  STRIPE_WEBHOOK_SECRET: z.string().default('whsec_placeholder'),
  SSLCOMMERZ_STORE_ID: z.string().default('sandbox_store'),
  SSLCOMMERZ_STORE_PASSWORD: z.string().default('sandbox_pass'),
  SSLCOMMERZ_IS_SANDBOX: z.coerce.boolean().default(true),
  OPENAI_API_KEY: z.string().default('sk-mock-key-for-local-dev'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(_env.error.format(), null, 2));
  process.exit(1);
}

export const env = _env.data;
export type Env = z.infer<typeof envSchema>;
export default env;
