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
    requireEmailVerification: false,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
  trustedOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://localhost:3000',
    'https://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ],
  // Enable advanced security features but be more permissive in development
  advanced: {
    crossSubDomainCookies: {
      enabled: false, // Disable for localhost development
    },
    defaultCookieAttributes: {
      secure: false, // Allow non-HTTPS in development
      sameSite: 'lax',
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
