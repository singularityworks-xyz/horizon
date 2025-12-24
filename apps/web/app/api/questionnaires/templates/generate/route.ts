import { prisma } from '@horizon/db';
import { NextRequest, NextResponse } from 'next/server';
import { apiErrors, guards } from '@/lib/security/guards';
import { auth } from '@/lib/auth';

// POST /api/questionnaires/templates/generate - Generate questionnaire using AI
export const POST = guards.authenticated(async (request, context, params) => {
  // Extra safety: Double check session role if context role is somehow mismatched
  const session = await auth.api.getSession({
    headers: Object.fromEntries(request.headers.entries()),
  });

  const sessionRole = (session?.user as any)?.role?.toUpperCase();
  const contextRole = context.role?.toUpperCase();

  // If NEITHER the database context nor the active session says ADMIN, deny access
  if (sessionRole !== 'ADMIN' && contextRole !== 'ADMIN') {
    return apiErrors.forbidden(
      `Admin access required. (Role: ${contextRole}, Session: ${sessionRole})`
    );
  }
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return apiErrors.badRequest('Please provide a detailed prompt (at least 10 characters)');
    }

    // Try to use the AI orchestrator from @horizon/ai
    let questions: {
      id: string;
      type: string;
      title: string;
      description?: string;
      required: boolean;
      options?: string[];
    }[] = [];
    let suggestedName = '';
    let suggestedDescription = '';

    try {
      // Dynamic import to handle potential missing AI package
      const { ai } = await import('@horizon/ai');

      const result = await ai.runTask({
        tenantId: context.tenantId,
        taskId: 'questionnaire-generate',
        promptId: 'questionnaire-generate',
        input: {
          prompt: prompt.trim(),
        },
        options: {
          timeoutMs: 60000, // 60 seconds for generation
        },
      });

      if (result.success && typeof result.data === 'string') {
        const parsed = parseAiResponse(result.data);
        questions = parsed.questions;
        suggestedName = parsed.suggestedName;
        suggestedDescription = parsed.suggestedDescription;
      }
    } catch (aiError) {
      // AI package not available or failed, use fallback
    }

    // Fallback: Generate basic questions based on prompt keywords
    if (questions.length === 0) {
      const fallbackResult = generateFallbackQuestions(prompt);
      questions = fallbackResult.questions;
      suggestedName = fallbackResult.suggestedName;
      suggestedDescription = fallbackResult.suggestedDescription;
    }

    return NextResponse.json({
      questions,
      suggestedName,
      suggestedDescription,
    });
  } catch (error) {
    console.error('Failed to generate questionnaire:', error);
    return apiErrors.internalError('Failed to generate questionnaire');
  }
});

// Parse AI response into structured question data
function parseAiResponse(response: string): {
  questions: any[];
  suggestedName: string;
  suggestedDescription: string;
} {
  // Try to extract JSON from the response
  const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        questions: parsed.questions || [],
        suggestedName: parsed.name || 'AI Generated Questionnaire',
        suggestedDescription: parsed.description || '',
      };
    } catch (e) {
      // Failed to parse JSON
    }
  }

  // Try direct JSON parse
  try {
    const parsed = JSON.parse(response);
    return {
      questions: parsed.questions || [],
      suggestedName: parsed.name || 'AI Generated Questionnaire',
      suggestedDescription: parsed.description || '',
    };
  } catch (e) {
    // Not valid JSON
  }

  // Return empty if parsing fails
  return {
    questions: [],
    suggestedName: 'AI Generated Questionnaire',
    suggestedDescription: '',
  };
}

// Fallback question generation based on prompt keywords
function generateFallbackQuestions(prompt: string): {
  questions: any[];
  suggestedName: string;
  suggestedDescription: string;
} {
  const lowerPrompt = prompt.toLowerCase();
  const questions: any[] = [];

  // Detect context from prompt
  const isWebDev =
    lowerPrompt.includes('web') ||
    lowerPrompt.includes('website') ||
    lowerPrompt.includes('frontend');
  const isMobileDev =
    lowerPrompt.includes('mobile') || lowerPrompt.includes('app') || lowerPrompt.includes('ios');
  const isOnboarding =
    lowerPrompt.includes('onboard') ||
    lowerPrompt.includes('intake') ||
    lowerPrompt.includes('client');
  const isFeedback = lowerPrompt.includes('feedback') || lowerPrompt.includes('review');

  // Generate contextual name
  let suggestedName = 'Client Questionnaire';
  if (isWebDev) suggestedName = 'Web Development Project Intake';
  else if (isMobileDev) suggestedName = 'Mobile App Project Intake';
  else if (isFeedback) suggestedName = 'Project Feedback Form';
  else if (isOnboarding) suggestedName = 'Client Onboarding Questionnaire';

  const suggestedDescription = `Automatically generated based on: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`;

  // Basic project questions
  questions.push({
    id: crypto.randomUUID(),
    type: 'TEXT',
    title: 'What is the name of your project?',
    description: 'Please provide a short, memorable name for your project.',
    required: true,
  });

  questions.push({
    id: crypto.randomUUID(),
    type: 'TEXTAREA',
    title: 'Please describe your project in detail',
    description: 'What are the main goals and objectives? What problem are you trying to solve?',
    required: true,
  });

  // Context-specific questions
  if (isWebDev || isMobileDev) {
    questions.push({
      id: crypto.randomUUID(),
      type: 'SELECT',
      title: 'What is your expected timeline?',
      required: true,
      options: ['1-2 weeks', '1 month', '2-3 months', '3-6 months', '6+ months', 'Flexible'],
    });

    questions.push({
      id: crypto.randomUUID(),
      type: 'SELECT',
      title: 'What is your budget range?',
      required: true,
      options: [
        'Under $5,000',
        '$5,000 - $15,000',
        '$15,000 - $50,000',
        '$50,000 - $100,000',
        'Over $100,000',
        'To be discussed',
      ],
    });
  }

  if (isWebDev) {
    questions.push({
      id: crypto.randomUUID(),
      type: 'MULTI_SELECT',
      title: 'What features do you need?',
      required: false,
      options: [
        'User authentication',
        'Payment processing',
        'Admin dashboard',
        'Content management',
        'Analytics',
        'Email notifications',
        'API integrations',
        'Other',
      ],
    });
  }

  if (isMobileDev) {
    questions.push({
      id: crypto.randomUUID(),
      type: 'MULTI_SELECT',
      title: 'Which platforms do you need?',
      required: true,
      options: ['iOS', 'Android', 'Both iOS and Android', 'Web app', 'All platforms'],
    });
  }

  if (isFeedback) {
    questions.push({
      id: crypto.randomUUID(),
      type: 'SELECT',
      title: 'How satisfied are you with the project so far?',
      required: true,
      options: ['Very satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very dissatisfied'],
    });

    questions.push({
      id: crypto.randomUUID(),
      type: 'TEXTAREA',
      title: 'What could we improve?',
      description: 'Please share any suggestions for how we can serve you better.',
      required: false,
    });
  }

  // Common closing questions
  questions.push({
    id: crypto.randomUUID(),
    type: 'URL',
    title: 'Do you have any reference websites or examples?',
    description: 'Share links to websites or apps that inspire you.',
    required: false,
  });

  questions.push({
    id: crypto.randomUUID(),
    type: 'TEXTAREA',
    title: 'Is there anything else you would like us to know?',
    description: 'Any additional information, concerns, or questions.',
    required: false,
  });

  return {
    questions,
    suggestedName,
    suggestedDescription,
  };
}
