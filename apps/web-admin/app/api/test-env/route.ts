import { NextResponse } from 'next/server';

export const GET = () => {
  const envVars = {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? 'SET' : 'NOT SET',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ? 'SET' : 'NOT SET',
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ? 'SET' : 'NOT SET',
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? 'SET' : 'NOT SET',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET',
    CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
      ? 'SET'
      : 'NOT SET',
    CLOUDFLARE_R2_ACCOUNT_ID: process.env.CLOUDFLARE_R2_ACCOUNT_ID ? 'SET' : 'NOT SET',
    CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS,
  };

  // Debug: show actual values (first 10 chars)
  const debugVars = {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET?.substring(0, 10) + '...' || 'NOT SET',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'NOT SET',
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'NOT SET',
    DATABASE_URL: process.env.DATABASE_URL?.substring(0, 20) + '...' || 'NOT SET',
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY?.substring(0, 10) + '...' || 'NOT SET',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY?.substring(0, 10) + '...' || 'NOT SET',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY?.substring(0, 10) + '...' || 'NOT SET',
    CLOUDFLARE_R2_ACCESS_KEY_ID:
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.substring(0, 10) + '...' || 'NOT SET',
    CLOUDFLARE_R2_SECRET_ACCESS_KEY:
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.substring(0, 10) + '...' || 'NOT SET',
    CLOUDFLARE_R2_ACCOUNT_ID:
      process.env.CLOUDFLARE_R2_ACCOUNT_ID?.substring(0, 10) + '...' || 'NOT SET',
    CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'NOT SET',
  };

  return NextResponse.json({
    message: 'Environment variables check',
    variables: envVars,
    debug: debugVars,
    envFileExists: true, // If we get here, the app is running
    timestamp: new Date().toISOString(),
  });
};
