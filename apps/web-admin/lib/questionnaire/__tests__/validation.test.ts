import { describe, test, expect } from 'vitest';
import {
  validateAnswerAgainstConfig,
  evaluateConditions,
  CreateQuestionSchema,
  SubmitAnswerSchema,
  CreateTemplateSchema,
  QuestionConditionSchema,
} from '../validation';

// Unit tests for validation functions
describe('validateAnswerAgainstConfig', () => {
  test('validates TEXT answers correctly', () => {
    const config = {
      type: 'TEXT' as const,
      minLength: 2,
      maxLength: 10,
    };

    expect(validateAnswerAgainstConfig({ type: 'TEXT', value: 'hi' }, config)).toBe(true);
    expect(validateAnswerAgainstConfig({ type: 'TEXT', value: 'h' }, config)).toBe(false); // too short
    expect(
      validateAnswerAgainstConfig({ type: 'TEXT', value: 'this is way too long' }, config)
    ).toBe(false); // too long
  });

  test('validates NUMBER answers correctly', () => {
    const config = {
      type: 'NUMBER' as const,
      min: 0,
      max: 100,
    };

    expect(validateAnswerAgainstConfig({ type: 'NUMBER', value: 50 }, config)).toBe(true);
    expect(validateAnswerAgainstConfig({ type: 'NUMBER', value: -1 }, config)).toBe(false); // too low
    expect(validateAnswerAgainstConfig({ type: 'NUMBER', value: 150 }, config)).toBe(false); // too high
  });

  test('validates SELECT answers correctly', () => {
    const config = {
      type: 'SELECT' as const,
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
      allowOther: false,
    };

    expect(validateAnswerAgainstConfig({ type: 'SELECT', value: 'a' }, config)).toBe(true);
    expect(validateAnswerAgainstConfig({ type: 'SELECT', value: 'c' }, config)).toBe(false); // not in options
  });

  test('validates MULTI_SELECT answers correctly', () => {
    const config = {
      type: 'MULTI_SELECT' as const,
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
      minSelections: 1,
      maxSelections: 2,
    };

    expect(validateAnswerAgainstConfig({ type: 'MULTI_SELECT', value: ['a'] }, config)).toBe(true);
    expect(validateAnswerAgainstConfig({ type: 'MULTI_SELECT', value: [] }, config)).toBe(false); // too few
    expect(
      validateAnswerAgainstConfig({ type: 'MULTI_SELECT', value: ['a', 'b', 'c'] }, config)
    ).toBe(false); // too many
  });

  test('validates URL answers correctly', () => {
    const config = {
      type: 'URL' as const,
      requireHttps: true,
    };

    expect(validateAnswerAgainstConfig({ type: 'URL', value: 'https://example.com' }, config)).toBe(
      true
    );
    expect(validateAnswerAgainstConfig({ type: 'URL', value: 'http://example.com' }, config)).toBe(
      false
    ); // not https
    expect(validateAnswerAgainstConfig({ type: 'URL', value: 'not-a-url' }, config)).toBe(false); // invalid URL
  });
});

describe('evaluateConditions', () => {
  test('evaluates equals conditions correctly', () => {
    const conditions = [
      {
        questionId: 'q1',
        operator: 'equals' as const,
        value: 'yes',
      },
    ];

    const answers = {
      q1: { type: 'SELECT' as const, value: 'yes' },
    };

    expect(evaluateConditions(conditions, answers)).toBe(true);

    const wrongAnswers = {
      q1: { type: 'SELECT' as const, value: 'no' },
    };

    expect(evaluateConditions(conditions, wrongAnswers)).toBe(false);
  });

  test('evaluates greater_than conditions correctly', () => {
    const conditions = [
      {
        questionId: 'q1',
        operator: 'greater_than' as const,
        value: 5,
      },
    ];

    const answers = {
      q1: { type: 'NUMBER' as const, value: 10 },
    };

    expect(evaluateConditions(conditions, answers)).toBe(true);

    const wrongAnswers = {
      q1: { type: 'NUMBER' as const, value: 3 },
    };

    expect(evaluateConditions(conditions, wrongAnswers)).toBe(false);
  });

  test('handles missing answers', () => {
    const conditions = [
      {
        questionId: 'q1',
        operator: 'equals' as const,
        value: 'yes',
      },
    ];

    const answers = {}; // no answers

    expect(evaluateConditions(conditions, answers)).toBe(false);
  });
});

// Schema validation tests
describe('Zod Schemas', () => {
  test('CreateQuestionSchema validates correctly', () => {
    const validQuestion = {
      type: 'TEXT',
      title: 'What is your name?',
      description: 'Please enter your full name',
      config: {
        type: 'TEXT',
        minLength: 2,
        maxLength: 50,
      },
      order: 1,
      required: true,
    };

    expect(() => CreateQuestionSchema.parse(validQuestion)).not.toThrow();

    const invalidQuestion = {
      type: 'INVALID_TYPE',
      title: '',
      order: -1,
    };

    expect(() => CreateQuestionSchema.parse(invalidQuestion)).toThrow();
  });

  test('SubmitAnswerSchema validates correctly', () => {
    const validAnswer = {
      questionId: 'c1234567890123456789012345678901234567890', // cuid format
      value: {
        type: 'TEXT',
        value: 'John Doe',
      },
    };

    expect(() => SubmitAnswerSchema.parse(validAnswer)).not.toThrow();

    const invalidAnswer = {
      questionId: 'invalid',
      value: {
        type: 'INVALID_TYPE',
        value: 'test',
      },
    };

    expect(() => SubmitAnswerSchema.parse(invalidAnswer)).toThrow();
  });

  test('CreateTemplateSchema validates correctly', () => {
    const validTemplate = {
      name: 'Customer Onboarding',
      description: 'Questions for new customer setup',
      projectId: 'c1234567890123456789012345678901234567890',
    };

    expect(() => CreateTemplateSchema.parse(validTemplate)).not.toThrow();

    const invalidTemplate = {
      name: '', // empty name
    };

    expect(() => CreateTemplateSchema.parse(invalidTemplate)).toThrow();
  });

  test('QuestionConditionSchema validates correctly', () => {
    const validCondition = {
      questionId: 'c1234567890123456789012345678901234567890',
      operator: 'equals',
      value: 'yes',
    };

    expect(() => QuestionConditionSchema.parse(validCondition)).not.toThrow();

    const invalidCondition = {
      questionId: 'q1',
      operator: 'invalid_operator',
      value: 'test',
    };

    expect(() => QuestionConditionSchema.parse(invalidCondition)).toThrow();
  });
});
