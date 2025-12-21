import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@horizon/db';
import { env } from '@/lib/env';

// Default tenant and role IDs (must match seed.ts)
const DEFAULT_TENANT_ID = 'default-tenant-001';
const CLIENT_ROLE_ID = 'role-client-001';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
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
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  // Hooks to link new users to the default tenant
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // After successful signup, create a record in the 'users' table
      if (ctx.path.startsWith('/sign-up')) {
        const newSession = ctx.context.newSession;
        if (newSession) {
          try {
            // Create user record linked to default tenant with client role
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
                id: newSession.user.id, // Use same ID as Better Auth user
                tenantId: DEFAULT_TENANT_ID,
                roleId: CLIENT_ROLE_ID,
                email: newSession.user.email,
                firstName: newSession.user.name?.split(' ')[0] || null,
                lastName: newSession.user.name?.split(' ').slice(1).join(' ') || null,
                updatedAt: new Date(),
              },
            });
            console.log(`✅ User ${newSession.user.email} linked to default tenant`);
          } catch (error) {
            console.error('Failed to create user tenant record:', error);
            // Don't fail the signup - just log the error
          }
        }
      }
    }),
  },
});
