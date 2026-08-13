import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env or server .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  HOST: z.string().default('http://localhost:5000'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  
  MONGODB_URI: process.env.NODE_ENV === 'production' 
    ? z.string().min(1) 
    : z.string().default('mongodb://127.0.0.1:27017/ai_khata_saas'),
  REDIS_URL: process.env.NODE_ENV === 'production'
    ? z.string().min(1)
    : z.string().default('redis://127.0.0.1:6379'),

  JWT_SECRET: process.env.NODE_ENV === 'production'
    ? z.string().min(10)
    : z.string().default('dev_jwt_access_secret_key_123456789_pkr_khata'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  JWT_REFRESH_SECRET: process.env.NODE_ENV === 'production'
    ? z.string().min(10)
    : z.string().default('dev_jwt_refresh_secret_key_987654321_pkr_khata'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  RAAST_API_KEY: process.env.NODE_ENV === 'production'
    ? z.string().min(1)
    : z.string().default('sandbox_raast_key_12345'),
  RAAST_WEBHOOK_SECRET: process.env.NODE_ENV === 'production'
    ? z.string().min(1)
    : z.string().default('sandbox_raast_webhook_secret_67890'),
  WHATSAPP_API_KEY: z.string().default('sandbox_whatsapp_key_abcde'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default('sandbox_phone_id_123'),
  SMS_PROVIDER_KEY: z.string().default('sandbox_sms_key_xyz'),
  AI_PROVIDER: z.enum(['mock', 'gemini', 'openai']).default('mock'),
  GEMINI_API_KEY: z.string().default('mock_gemini_key')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
