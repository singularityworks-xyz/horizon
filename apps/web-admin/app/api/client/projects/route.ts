import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@horizon/db';
import { guards, apiErrors } from '@/lib/security/guards';
import { runtime } from '@/lib/api-runtime';

// GET /api/client/projects - List client's projects (read-only)
export const GET = guards.clientOnly(async (request, context) => {
  try {
    const projects = await prisma.project.findMany({
      where: { tenantId: context.tenantId },
      include: {
        workflows: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1, // Get the latest workflow
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Transform response to be client-friendly
    const clientProjects = projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      client: project.client,
      latestWorkflow: project.workflows[0] || null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));

    return NextResponse.json({ projects: clientProjects });
  } catch (error) {
    console.error('Failed to fetch client projects:', error);
    return apiErrors.internalError('Failed to fetch projects');
  }
});
