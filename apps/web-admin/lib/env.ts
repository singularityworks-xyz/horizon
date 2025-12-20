import { z } from 'zod';

const envSchema = z.object({
  // Better Auth Configuration
  BETTER_AUTH_SECRET: z.string().min(1, 'BETTER_AUTH_SECRET is required'),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // AI Providers
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

  // File Storage (Cloudflare R2)
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1, 'CLOUDFLARE_R2_ACCESS_KEY_ID is required'),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1, 'CLOUDFLARE_R2_SECRET_ACCESS_KEY is required'),
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().min(1, 'CLOUDFLARE_R2_ACCOUNT_ID is required'),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1, 'CLOUDFLARE_R2_BUCKET_NAME is required'),

  // Application Settings
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  ENABLE_ANALYTICS: z.string().optional().default('false'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse({
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      DATABASE_URL: process.env.DATABASE_URL,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      CLOUDFLARE_R2_ACCOUNT_ID: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
      CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      NODE_ENV: process.env.NODE_ENV,
      ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n');
      throw new Error(`❌ Invalid environment variables:\n${missingVars}`);
    }
    throw error;
  }
}

// Validate environment variables on module load (server-side only)
// This will fail fast if any required variables are missing
export const env = validateEnv();

// Export a function to check if we're in a specific environment
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
