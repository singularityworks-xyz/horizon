import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@horizon/config';

// R2 client configuration
export const r2Client = new S3Client({
  region: 'auto', // R2 uses 'auto' region
  endpoint: env.CLOUDFLARE_R2_ACCOUNT_ID
    ? `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined,
  credentials:
    env.CLOUDFLARE_R2_ACCESS_KEY_ID && env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
          secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        }
      : undefined,
});

// Storage configuration
export const STORAGE_CONFIG = {
  bucketName: env.CLOUDFLARE_R2_BUCKET_NAME || 'horizon-assets',
  region: env.CLOUDFLARE_R2_REGION || 'auto',
  publicBaseUrl: env.CLOUDFLARE_R2_PUBLIC_BASE_URL,
  presignedUrlExpiry: 3600, // 1 hour for uploads
  downloadUrlExpiry: 300, // 5 minutes for downloads
} as const;

// Generate tenant-scoped storage key
export function generateStorageKey(tenantId: string, assetId: string, fileName: string): string {
  // Sanitize filename and ensure it's safe for storage
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `tenants/${tenantId}/assets/${assetId}/${sanitizedFileName}`;
}

// Generate presigned URL for upload
export async function createPresignedUploadUrl(
  storageKey: string,
  mimeType: string,
  maxSizeBytes: number
): Promise<string> {
  if (!STORAGE_CONFIG.bucketName) {
    throw new Error('R2 bucket name not configured');
  }

  const command = new PutObjectCommand({
    Bucket: STORAGE_CONFIG.bucketName,
    Key: storageKey,
    ContentType: mimeType,
    ContentLength: maxSizeBytes,
    // Additional security headers
    Metadata: {
      uploadedAt: new Date().toISOString(),
    },
  });

  try {
    const signedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: STORAGE_CONFIG.presignedUrlExpiry,
    });
    return signedUrl;
  } catch (error) {
    console.error('Failed to create presigned upload URL:', error);
    throw new Error('Failed to generate upload URL');
  }
}

// Generate presigned URL for download
export async function createPresignedDownloadUrl(storageKey: string): Promise<string> {
  if (!STORAGE_CONFIG.bucketName) {
    throw new Error('R2 bucket name not configured');
  }

  const command = new GetObjectCommand({
    Bucket: STORAGE_CONFIG.bucketName,
    Key: storageKey,
  });

  try {
    const signedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: STORAGE_CONFIG.downloadUrlExpiry,
    });
    return signedUrl;
  } catch (error) {
    console.error('Failed to create presigned download URL:', error);
    throw new Error('Failed to generate download URL');
  }
}

// Delete file from storage
export async function deleteFromStorage(storageKey: string): Promise<void> {
  if (!STORAGE_CONFIG.bucketName) {
    throw new Error('R2 bucket name not configured');
  }

  const command = new DeleteObjectCommand({
    Bucket: STORAGE_CONFIG.bucketName,
    Key: storageKey,
  });

  try {
    await r2Client.send(command);
  } catch (error) {
    console.error('Failed to delete file from storage:', error);
    throw new Error('Failed to delete file from storage');
  }
}

// Validate storage configuration
export function validateStorageConfig(): boolean {
  const required = [
    env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    env.CLOUDFLARE_R2_ACCOUNT_ID,
    env.CLOUDFLARE_R2_BUCKET_NAME,
  ];

  return required.every(Boolean);
}
