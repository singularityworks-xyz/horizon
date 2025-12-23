import { prisma } from '@horizon/db';
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { guards } from '@/lib/security/guards';

// SECURITY: Admin-only endpoint - do NOT expose in production
export const GET = guards.adminOnly(async (request, context, params) => {
  // Get current session info
  let sessionInfo = null;
  try {
    const session = await auth.api.getSession({
      headers: Object.fromEntries(request.headers.entries()),
    });
    sessionInfo = session
      ? {
          hasSession: true,
          userId: session.user.id,
          userEmail: session.user.email,
          sessionId: session.session.id,
        }
      : { hasSession: false };
  } catch (error) {
    sessionInfo = {
      hasSession: false,
      error: error instanceof Error ? error.message : 'Unknown session error',
    };
  }

  // Get database session count
  let dbSessionCount = 0;
  try {
    dbSessionCount = await prisma.session.count();
  } catch (error) {
    dbSessionCount = -1; // Error indicator
  }

  // Get user count
  let userCount = 0;
  try {
    userCount = await prisma.user.count();
  } catch (error) {
    userCount = -1;
  }

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
    message: 'Environment and Auth Debug Info',
    auth: {
      session: sessionInfo,
      database: {
        userCount,
        sessionCount: dbSessionCount,
      },
      headers: {
        cookie: request.headers.get('cookie') ? 'present' : 'none',
        origin: request.headers.get('origin'),
        'user-agent': request.headers.get('user-agent')?.substring(0, 50),
      },
    },
    variables: envVars,
    debug: debugVars,
    envFileExists: true, // If we get here, the app is running
    timestamp: new Date().toISOString(),
  });
});

// POST endpoint to clear all sessions (for debugging auth issues)
// SECURITY: Admin-only endpoint - development only
export const POST = guards.adminOnly(async (request, context, params) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    const body = await request.json();
    if (body.action === 'clear-sessions') {
      const deletedCount = await prisma.session.deleteMany();
      return NextResponse.json({
        message: 'Sessions cleared',
        deletedCount: deletedCount.count,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to clear sessions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
