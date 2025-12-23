import { prisma } from '@horizon/db';
import { type NextRequest, NextResponse } from 'next/server';
import { type AuthenticatedContext, apiErrors, guards } from '@/lib/security/guards';
import { createPresignedDownloadUrl, validateStorageConfig } from '@/lib/storage/r2';
export const runtime = 'nodejs';

// Context type for asset handlers
export type AssetContext = AuthenticatedContext & {
  role: 'ADMIN';
};

// GET /api/assets/[id] - Get single asset with download URL
export const GET = guards.adminOnly(handleGetAsset);

// DELETE /api/assets/[id] - Delete asset (soft delete by marking as inactive)
export const DELETE = guards.adminOnly(handleDeleteAsset);

// Extracted handler for get asset logic (testable without auth)
export async function handleGetAsset(
  request: NextRequest,
  context: AssetContext,
  params: any
): Promise<NextResponse> {
  try {
    const assetId = params?.id || new URL(request.url).searchParams.get('id');

    if (!assetId) {
      return apiErrors.badRequest('Asset ID is required');
    }

    // Get asset with full details
    const asset = await prisma.assets.findFirst({
      where: {
        id: assetId,
        tenantId: context.tenantId,
      },
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
        asset_versions: {
          orderBy: { version: 'desc' },
          take: 5, // Include recent versions
        },
        _count: {
          select: { asset_versions: true },
        },
      },
    });

    if (!asset) {
      return apiErrors.forbidden('Asset not found or access denied');
    }

    // Check access level permissions
    if (asset.accessLevel === 'ADMIN_ONLY' && context.role !== 'ADMIN') {
      return apiErrors.forbidden('Access denied to this asset');
    }

    // Generate download URL if storage is configured
    let downloadUrl: string | null = null;
    let downloadExpiresAt: string | null = null;

    if (validateStorageConfig()) {
      try {
        downloadUrl = await createPresignedDownloadUrl(asset.storageKey);
        downloadExpiresAt = new Date(Date.now() + 300 * 1000).toISOString(); // 5 minutes
      } catch (error) {
        console.warn('Failed to generate download URL for asset:', asset.id, error);
        // Continue without download URL - asset can still be viewed
      }
    }

    return NextResponse.json({
      asset,
      downloadUrl,
      downloadExpiresAt,
    });
  } catch (error) {
    console.error('Failed to fetch asset:', error);
    return apiErrors.internalError('Failed to fetch asset');
  }
}

// Extracted handler for delete asset logic (testable without auth)
export async function handleDeleteAsset(
  request: NextRequest,
  context: AssetContext,
  params: any
): Promise<NextResponse> {
  try {
    const assetId = params?.id || new URL(request.url).searchParams.get('id');

    if (!assetId) {
      return apiErrors.badRequest('Asset ID is required');
    }

    // Check if asset exists and belongs to tenant
    const asset = await prisma.assets.findFirst({
      where: {
        id: assetId,
        tenantId: context.tenantId,
      },
      select: {
        id: true,
        storageKey: true,
        _count: {
          select: { asset_versions: true },
        },
      },
    });

    if (!asset) {
      return apiErrors.forbidden('Asset not found or access denied');
    }

    // Check if asset has multiple versions (don't allow deletion if versions exist)
    if (asset._count.asset_versions > 1) {
      return apiErrors.badRequest('Cannot delete asset with multiple versions');
    }

    // Delete from storage first (if configured)
    if (validateStorageConfig() && asset.storageKey) {
      try {
        // TODO: Implement storage deletion
        // await deleteFromStorage(asset.storageKey)
        console.log(`[DELETE_ASSET] Would delete from storage: ${asset.storageKey}`);
      } catch (error) {
        console.warn('Failed to delete asset from storage:', error);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete asset from database (cascade will delete versions)
    await prisma.assets.delete({
      where: {
        id: assetId,
        tenantId: context.tenantId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete asset:', error);

    if (error instanceof Error && error.message.includes('Record to delete not found')) {
      return apiErrors.forbidden('Asset not found or access denied');
    }

    return apiErrors.internalError('Failed to delete asset');
  }
}
