import { cache } from 'react';
import { prisma } from '@horizon/db';

/**
 * Fetches basic client identity (ID, Name, Email, CreatedAt).
 * This is meant to be the "Fast Shell" data that renders immediately.
 */
export const getClientIdentity = cache(async (id: string) => {
  return prisma.user.findUnique({
    where: { id, role: 'CLIENT' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
});

/**
 * Fetches heavy client data including projects, workflows, and questionnaires.
 * Used for progressive streaming sections.
 */
export const getClientDetailData = cache(async (email: string) => {
  return prisma.clients.findFirst({
    where: { email },
    include: {
      projects: {
        include: {
          workflows: {
            include: {
              phases: true,
            },
          },
          questionnaire_submissions: {
            include: {
              template: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
});
