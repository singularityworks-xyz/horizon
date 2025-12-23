import { prisma } from '@horizon/db';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAuthMiddleware } from 'better-auth/api';
import { env } from '@/lib/env';

// Default tenant ID
const DEFAULT_TENANT_ID = 'default-tenant-001';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'CLIENT',
        input: false, // Don't allow user to set their own role during signup
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    // SECURITY: Email verification required in production
    requireEmailVerification: process.env.NODE_ENV === 'production',
    // Don't auto sign-in unverified users
    autoSignIn: process.env.NODE_ENV !== 'production',
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },
  trustedOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://localhost:3000',
    'https://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ],
  // SECURITY: Production-ready cookie configuration
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
    defaultCookieAttributes: {
      // CRITICAL: Use secure cookies in production
      secure: process.env.NODE_ENV === 'production',
      // CRITICAL: Use strict sameSite in production to prevent CSRF
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      // CRITICAL: httpOnly prevents XSS attacks
      httpOnly: true,
      // Set domain if needed for subdomain support
      domain: process.env.COOKIE_DOMAIN,
    },
  },
  baseURL: env.BETTER_AUTH_URL.endsWith('/api/auth')
    ? env.BETTER_AUTH_URL
    : `${env.BETTER_AUTH_URL}/api/auth`,
  secret: env.BETTER_AUTH_SECRET,

  // Hooks to link new users to the default tenant
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // After successful signup, create a record in the 'users' table
      if (ctx.path.startsWith('/sign-up')) {
        const newSession = ctx.context.newSession;
        if (newSession) {
          try {
            // Create user record linked to default tenant with CLIENT role
            await prisma.users.upsert({
              where: {
                tenantId_email: {
                  tenantId: DEFAULT_TENANT_ID,
                  email: newSession.user.email,
                },
              },
              update: {
                updatedAt: new Date(),
              },
              create: {
                id: newSession.user.id,
                tenantId: DEFAULT_TENANT_ID,
                email: newSession.user.email,
                firstName: newSession.user.name?.split(' ')[0] || null,
                lastName: newSession.user.name?.split(' ').slice(1).join(' ') || null,
                updatedAt: new Date(),
                userRoles: {
                  connect: {
                    tenantId_name: {
                      tenantId: DEFAULT_TENANT_ID,
                      name: 'client',
                    },
                  },
                },
              },
            });
            console.log(
              `✅ User ${newSession.user.email} linked to default tenant with CLIENT role`
            );
          } catch (error) {
            console.error('Failed to create user tenant record:', error);
            // Don't fail the signup - just log the error
          }
        }
      }
    }),
  },
});
