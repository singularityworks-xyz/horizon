import { z } from 'zod';

/**
 * Environment variable schema for Horizon applications
 * This ensures type safety and validation for all environment variables
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().optional(),

  // External Services
  OPENAI_API_KEY: z.string().optional(),
  WORKOS_API_KEY: z.string().optional(),
  WORKOS_CLIENT_ID: z.string().optional(),

  // File Storage
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().optional(),
  CLOUDFLARE_R2_REGION: z.string().optional(),
  CLOUDFLARE_R2_PUBLIC_BASE_URL: z.string().url().optional(),

  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),

  // Feature Flags
  ENABLE_ANALYTICS: z.coerce.boolean().default(false),
});

/**
 * Parsed and validated environment variables
 * This is the single source of truth for environment configuration
 */
export const env = envSchema.parse(process.env);

/**
 * Type definition for environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Utility to check if we're in development mode
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Utility to check if we're in production mode
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Utility to check if we're in test mode
 */
export const isTest = env.NODE_ENV === 'test';
