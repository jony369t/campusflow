import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  UNIVERSITY_TIMEZONE: z.string().default('Asia/Dhaka'),
  UNIVERSITY_NAME: z.string().default('Metropolitan University of Science & Technology'),
  DEFAULT_CLASS_CODE: z.string().default('CSE-60E'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(24),
  COOKIE_SECURE: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  CSRF_PROTECTION_ENABLED: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  ENFORCE_UNIVERSITY_EMAIL_DOMAIN: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  APPROVED_EMAIL_DOMAINS: z
    .string()
    .default('univ.edu.bd,cse.univ.edu.bd')
    .transform((s) =>
      s
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean)
    ),
  MAX_ATTACHMENT_SIZE_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  ALLOWED_ATTACHMENT_MIME_TYPES: z
    .string()
    .default('application/pdf,image/png,image/jpeg,image/webp')
    .transform((s) => s.split(',').map((m) => m.trim())),
  AI_PROVIDER: z.enum(['openai-compatible', 'disabled']).default('openai-compatible'),
  AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  AI_API_KEY: z.string().optional().default(''),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  AI_MAX_INPUT_CHARS: z.coerce.number().int().positive().default(12000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(900),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  AI_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(15),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const env: EnvConfig = envSchema.parse({
  ...process.env,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusflow_ai',
  JWT_SECRET:
    process.env.JWT_SECRET || 'dev-only-jwt-secret-key-at-least-32-bytes-long-0001',
  COOKIE_SECRET:
    process.env.COOKIE_SECRET || 'dev-only-cookie-secret-key-at-least-32-bytes-0002',
});
