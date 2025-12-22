import { prisma } from '@horizon/db';
import { type NextRequest, NextResponse } from 'next/server';
import { AssetQuerySchema } from '@/lib/assets/validation';
import { apiErrors, guards } from '@/lib/security/guards';
export const runtime = 'nodejs';

// Context type for asset handlers
export type AssetContext = {
  tenantId: string;
  userId: string;
  role: 'ADMIN' | 'CLIENT';
};

// GET /api/assets - List assets for tenant with filtering
export const GET = guards.adminOnly(handleListAssets);

// Extracted handler for list logic (testable without auth)
export async function handleListAssets(
  request: NextRequest,
  context: AssetContext,
  params: any
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryData = {
      projectId: searchParams.get('projectId') || undefined,
      questionId: searchParams.get('questionId') || undefined,
      answerId: searchParams.get('answerId') || undefined,
      workflowId: searchParams.get('workflowId') || undefined,
      phaseId: searchParams.get('phaseId') || undefined,
      taskId: searchParams.get('taskId') || undefined,
      uploaderId: searchParams.get('uploaderId') || undefined,
      accessLevel: searchParams.get('accessLevel') || undefined,
      mimeType: searchParams.get('mimeType') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    // Validate query parameters
    const validatedQuery = AssetQuerySchema.parse(queryData);

    // Build where clause
    const where = {
      tenantId: context.tenantId,
      ...(validatedQuery.projectId && { projectId: validatedQuery.projectId }),
      ...(validatedQuery.questionId && {
        questionId: validatedQuery.questionId,
      }),
      ...(validatedQuery.answerId && { answerId: validatedQuery.answerId }),
      ...(validatedQuery.workflowId && {
        workflowId: validatedQuery.workflowId,
      }),
      ...(validatedQuery.phaseId && { phaseId: validatedQuery.phaseId }),
      ...(validatedQuery.taskId && { taskId: validatedQuery.taskId }),
      ...(validatedQuery.uploaderId && {
        uploaderId: validatedQuery.uploaderId,
      }),
      ...(validatedQuery.accessLevel && {
        accessLevel: validatedQuery.accessLevel,
      }),
      ...(validatedQuery.mimeType && {
        mimeType: { contains: validatedQuery.mimeType },
      }),
    };

    // Get assets with related data
    const [assets, totalCount] = await Promise.all([
      prisma.assets.findMany({
        where,
        include: {
          projects: { select: { id: true, name: true } },
          questions: { select: { id: true, title: true } },
          answers: { select: { id: true } },
          workflows: { select: { id: true, name: true } },
          phases: { select: { id: true, name: true } },
          tasks: { select: { id: true, title: true } },
          users: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { asset_versions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: validatedQuery.limit,
        skip: validatedQuery.offset,
      }),
      prisma.assets.count({ where }),
    ]);

    return NextResponse.json({
      assets,
      pagination: {
        total: totalCount,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        hasMore: (validatedQuery.offset || 0) + (validatedQuery.limit || 20) < totalCount,
      },
    });
  } catch (error) {
    console.error('Failed to fetch assets:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid query parameters');
    }

    return apiErrors.internalError('Failed to fetch assets');
  }
}
