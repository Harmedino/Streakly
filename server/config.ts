import { z } from 'zod';
const env = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/streakly'),
    APP_ORIGIN: z.string().url().default('http://localhost:4200'),
    SMTP_URL: z.string().optional(),
    MAIL_FROM: z.string().default('Streakly <no-reply@localhost>'),
  })
  .parse(process.env);
if (env.NODE_ENV === 'production' && !env.APP_ORIGIN.startsWith('https://'))
  throw new Error('Production APP_ORIGIN must use HTTPS.');
export const config = env;
