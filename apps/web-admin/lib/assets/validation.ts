import { z } from 'zod';

// Asset metadata validation schemas
export const ASSET_VALIDATION = {
  // Default file size limit: 25MB
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024,

  // Allowed MIME types for different categories
  ALLOWED_MIME_TYPES: {
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf',
    ],
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    archives: [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ],
  },

  // All allowed MIME types combined
  get ALL_ALLOWED_MIME_TYPES() {
    return [
      ...this.ALLOWED_MIME_TYPES.documents,
      ...this.ALLOWED_MIME_TYPES.images,
      ...this.ALLOWED_MIME_TYPES.archives,
    ];
  },
} as const;

// Asset presign request schema
export const AssetPresignSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(ASSET_VALIDATION.MAX_FILE_SIZE_BYTES),
  projectId: z.string().cuid().optional(),
  questionId: z.string().cuid().optional(),
  answerId: z.string().cuid().optional(),
  workflowId: z.string().cuid().optional(),
  phaseId: z.string().cuid().optional(),
  taskId: z.string().cuid().optional(),
  accessLevel: z.enum(['ADMIN_ONLY', 'TENANT', 'PUBLIC']).default('TENANT'),
});

export type AssetPresignInput = z.infer<typeof AssetPresignSchema>;

// Asset complete request schema (after upload)
export const AssetCompleteSchema = z.object({
  storageKey: z.string().min(1),
  checksum: z.string().min(1), // SHA-256 hash
  virusScanResult: z.object({
    isClean: z.boolean(),
    scanId: z.string().optional(),
    scannedAt: z.string().datetime(),
  }),
});

export type AssetCompleteInput = z.infer<typeof AssetCompleteSchema>;

// Asset query/filter schema
export const AssetQuerySchema = z.object({
  projectId: z.string().cuid().optional(),
  questionId: z.string().cuid().optional(),
  answerId: z.string().cuid().optional(),
  workflowId: z.string().cuid().optional(),
  phaseId: z.string().cuid().optional(),
  taskId: z.string().cuid().optional(),
  uploaderId: z.string().cuid().optional(),
  accessLevel: z.enum(['ADMIN_ONLY', 'TENANT', 'PUBLIC']).optional(),
  mimeType: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type AssetQueryInput = z.infer<typeof AssetQuerySchema>;

// Validation helper functions
export function validateFileType(mimeType: string): boolean {
  return ASSET_VALIDATION.ALL_ALLOWED_MIME_TYPES.includes(mimeType);
}

export function validateFileSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= ASSET_VALIDATION.MAX_FILE_SIZE_BYTES;
}

export function getFileCategory(mimeType: string): string {
  if (ASSET_VALIDATION.ALLOWED_MIME_TYPES.documents.includes(mimeType)) {
    return 'document';
  }
  if (ASSET_VALIDATION.ALLOWED_MIME_TYPES.images.includes(mimeType)) {
    return 'image';
  }
  if (ASSET_VALIDATION.ALLOWED_MIME_TYPES.archives.includes(mimeType)) {
    return 'archive';
  }
  return 'unknown';
}

// Asset linking validation - ensure only one context is specified
export function validateAssetContext(input: AssetPresignInput): boolean {
  const contextFields = [
    input.projectId,
    input.questionId,
    input.answerId,
    input.workflowId,
    input.phaseId,
    input.taskId,
  ];

  // At least one context should be provided
  const hasContext = contextFields.some((field) => field != null);

  // If questionId is provided, answerId should also be provided (for file upload questions)
  if (input.questionId && !input.answerId) {
    return false;
  }

  // If answerId is provided, questionId should also be provided
  if (input.answerId && !input.questionId) {
    return false;
  }

  // If phaseId is provided, workflowId should also be provided
  if (input.phaseId && !input.workflowId) {
    return false;
  }

  // If taskId is provided, phaseId should also be provided
  if (input.taskId && !input.phaseId) {
    return false;
  }

  return hasContext;
}
