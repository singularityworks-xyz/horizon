import { z } from 'zod';

// Base enums from Prisma
export const QuestionTypeEnum = z.enum([
  'TEXT',
  'TEXTAREA',
  'SELECT',
  'MULTI_SELECT',
  'FILE_UPLOAD',
  'URL',
  'DATE',
  'NUMBER',
]);

export const SubmissionStatusEnum = z.enum(['DRAFT', 'SUBMITTED', 'LOCKED']);

export type QuestionType = z.infer<typeof QuestionTypeEnum>;
export type SubmissionStatus = z.infer<typeof SubmissionStatusEnum>;

// Conditional logic schemas
export const QuestionConditionSchema = z.object({
  questionId: z.string().cuid(),
  operator: z.enum([
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'greater_than',
    'less_than',
  ]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});

export type QuestionCondition = z.infer<typeof QuestionConditionSchema>;

// Question config schemas per type
export const TextQuestionConfigSchema = z.object({
  minLength: z.number().min(0).optional(),
  maxLength: z.number().min(1).optional(),
  pattern: z.string().optional(), // regex pattern
  placeholder: z.string().optional(),
});

export const TextareaQuestionConfigSchema = z.object({
  minLength: z.number().min(0).optional(),
  maxLength: z.number().min(1).optional(),
  rows: z.number().min(1).max(20).optional(),
  placeholder: z.string().optional(),
});

export const SelectQuestionConfigSchema = z.object({
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    )
    .min(1),
  allowOther: z.boolean().optional(),
});

export const MultiSelectQuestionConfigSchema = z.object({
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    )
    .min(1),
  minSelections: z.number().min(0).optional(),
  maxSelections: z.number().min(1).optional(),
  allowOther: z.boolean().optional(),
});

export const FileUploadQuestionConfigSchema = z.object({
  acceptedTypes: z.array(z.string()).optional(), // MIME types
  maxSize: z.number().min(1).optional(), // bytes
  maxFiles: z.number().min(1).max(10).optional(),
  allowMultiple: z.boolean().optional(),
});

export const UrlQuestionConfigSchema = z.object({
  allowedDomains: z.array(z.string()).optional(), // domain restrictions
  requireHttps: z.boolean().optional(),
});

export const DateQuestionConfigSchema = z.object({
  minDate: z.string().optional(), // ISO date string
  maxDate: z.string().optional(), // ISO date string
  format: z.enum(['date', 'datetime']).optional(),
});

export const NumberQuestionConfigSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().min(0.01).optional(),
  decimals: z.number().min(0).max(10).optional(),
});

// Union type for all question configs
export const QuestionConfigSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('TEXT'), ...TextQuestionConfigSchema.shape }),
  z.object({
    type: z.literal('TEXTAREA'),
    ...TextareaQuestionConfigSchema.shape,
  }),
  z.object({ type: z.literal('SELECT'), ...SelectQuestionConfigSchema.shape }),
  z.object({
    type: z.literal('MULTI_SELECT'),
    ...MultiSelectQuestionConfigSchema.shape,
  }),
  z.object({
    type: z.literal('FILE_UPLOAD'),
    ...FileUploadQuestionConfigSchema.shape,
  }),
  z.object({ type: z.literal('URL'), ...UrlQuestionConfigSchema.shape }),
  z.object({ type: z.literal('DATE'), ...DateQuestionConfigSchema.shape }),
  z.object({ type: z.literal('NUMBER'), ...NumberQuestionConfigSchema.shape }),
]);

export type QuestionConfig = z.infer<typeof QuestionConfigSchema>;

// Question schema
export const CreateQuestionSchema = z.object({
  type: QuestionTypeEnum,
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  config: QuestionConfigSchema.optional(),
  order: z.number().min(0),
  required: z.boolean().default(false),
  conditions: z.array(QuestionConditionSchema).optional(),
});

export const UpdateQuestionSchema = CreateQuestionSchema.partial().extend({
  id: z.string().cuid(),
});

export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;

// Template schema
export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  projectId: z.string().cuid().optional(),
});

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;

// Answer schemas per question type
export const TextAnswerSchema = z.object({
  type: z.literal('TEXT'),
  value: z.string(),
});

export const TextareaAnswerSchema = z.object({
  type: z.literal('TEXTAREA'),
  value: z.string(),
});

export const SelectAnswerSchema = z.object({
  type: z.literal('SELECT'),
  value: z.string(),
});

export const MultiSelectAnswerSchema = z.object({
  type: z.literal('MULTI_SELECT'),
  value: z.array(z.string()),
});

export const FileUploadAnswerSchema = z.object({
  type: z.literal('FILE_UPLOAD'),
  value: z.array(
    z.object({
      assetId: z.string().cuid(),
      name: z.string(),
      url: z.string(),
    })
  ),
});

export const UrlAnswerSchema = z.object({
  type: z.literal('URL'),
  value: z.string().url(),
});

export const DateAnswerSchema = z.object({
  type: z.literal('DATE'),
  value: z.string(), // ISO date string
});

export const NumberAnswerSchema = z.object({
  type: z.literal('NUMBER'),
  value: z.number(),
});

// Union type for all answer types
export const AnswerValueSchema = z.discriminatedUnion('type', [
  TextAnswerSchema,
  TextareaAnswerSchema,
  SelectAnswerSchema,
  MultiSelectAnswerSchema,
  FileUploadAnswerSchema,
  UrlAnswerSchema,
  DateAnswerSchema,
  NumberAnswerSchema,
]);

export type AnswerValue = z.infer<typeof AnswerValueSchema>;

// Answer submission schema
export const SubmitAnswerSchema = z.object({
  questionId: z.string().cuid(),
  value: AnswerValueSchema,
});

export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>;

// Submission schema
export const CreateSubmissionSchema = z.object({
  templateId: z.string().cuid(),
  projectId: z.string().cuid().optional(),
});

export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>;

// Validation helpers
export function validateAnswerAgainstConfig(
  value: AnswerValue,
  config: QuestionConfig | null | undefined
): boolean {
  switch (value.type) {
    case 'TEXT': {
      const textConfig = config?.type === 'TEXT' ? config : undefined;
      if (textConfig?.minLength && value.value.length < textConfig.minLength) return false;
      if (textConfig?.maxLength && value.value.length > textConfig.maxLength) return false;
      if (textConfig?.pattern && !new RegExp(textConfig.pattern).test(value.value)) return false;
      return true;
    }

    case 'TEXTAREA': {
      const textareaConfig = config?.type === 'TEXTAREA' ? config : undefined;
      if (textareaConfig?.minLength && value.value.length < textareaConfig.minLength) return false;
      if (textareaConfig?.maxLength && value.value.length > textareaConfig.maxLength) return false;
      return true;
    }

    case 'SELECT': {
      const selectConfig = config?.type === 'SELECT' ? config : undefined;
      if (!selectConfig) return true;
      const validOptions = selectConfig.options.map((o) => o.value);
      if (selectConfig.allowOther) return true;
      return validOptions.includes(value.value);
    }

    case 'MULTI_SELECT': {
      const multiConfig = config?.type === 'MULTI_SELECT' ? config : undefined;
      if (!multiConfig) return true;
      if (multiConfig.minSelections && value.value.length < multiConfig.minSelections) return false;
      if (multiConfig.maxSelections && value.value.length > multiConfig.maxSelections) return false;
      const validOptions = multiConfig.options.map((o) => o.value);
      if (multiConfig.allowOther) return true;
      return value.value.every((v) => validOptions.includes(v));
    }

    case 'FILE_UPLOAD': {
      const fileConfig = config?.type === 'FILE_UPLOAD' ? config : undefined;
      if (fileConfig?.maxFiles && value.value.length > fileConfig.maxFiles) return false;
      return true;
    }

    case 'URL': {
      const urlConfig = config?.type === 'URL' ? config : undefined;
      try {
        const url = new URL(value.value);
        if (urlConfig?.requireHttps && url.protocol !== 'https:') return false;
        if (urlConfig?.allowedDomains?.length) {
          return urlConfig.allowedDomains.some(
            (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)
          );
        }
        return true;
      } catch {
        return false;
      }
    }

    case 'DATE': {
      const dateConfig = config?.type === 'DATE' ? config : undefined;
      const date = new Date(value.value);
      if (isNaN(date.getTime())) return false;
      if (dateConfig?.minDate && date < new Date(dateConfig.minDate)) return false;
      if (dateConfig?.maxDate && date > new Date(dateConfig.maxDate)) return false;
      return true;
    }

    case 'NUMBER': {
      const numberConfig = config?.type === 'NUMBER' ? config : undefined;
      if (numberConfig?.min !== undefined && value.value < numberConfig.min) return false;
      if (numberConfig?.max !== undefined && value.value > numberConfig.max) return false;
      return true;
    }

    default:
      return false;
  }
}

export function evaluateConditions(
  conditions: QuestionCondition[],
  previousAnswers: Record<string, AnswerValue>
): boolean {
  if (!conditions.length) return true;

  return conditions.every((condition) => {
    const answer = previousAnswers[condition.questionId];
    if (!answer) return false;

    switch (condition.operator) {
      case 'equals':
        return answer.type === 'SELECT' ||
          answer.type === 'TEXT' ||
          answer.type === 'TEXTAREA' ||
          answer.type === 'URL'
          ? answer.value === condition.value
          : answer.type === 'NUMBER'
            ? answer.value === condition.value
            : false;

      case 'not_equals':
        return answer.type === 'SELECT' ||
          answer.type === 'TEXT' ||
          answer.type === 'TEXTAREA' ||
          answer.type === 'URL'
          ? answer.value !== condition.value
          : answer.type === 'NUMBER'
            ? answer.value !== condition.value
            : true;

      case 'contains':
        if (answer.type === 'MULTI_SELECT') {
          return answer.value.includes(condition.value as string);
        }
        if (answer.type === 'TEXT' || answer.type === 'TEXTAREA') {
          return answer.value.includes(condition.value as string);
        }
        return false;

      case 'not_contains':
        if (answer.type === 'MULTI_SELECT') {
          return !answer.value.includes(condition.value as string);
        }
        if (answer.type === 'TEXT' || answer.type === 'TEXTAREA') {
          return !answer.value.includes(condition.value as string);
        }
        return true;

      case 'greater_than':
        return answer.type === 'NUMBER' ? answer.value > (condition.value as number) : false;

      case 'less_than':
        return answer.type === 'NUMBER' ? answer.value < (condition.value as number) : false;

      default:
        return false;
    }
  });
}
