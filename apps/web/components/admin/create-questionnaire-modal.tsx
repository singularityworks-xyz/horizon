'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  Sparkles,
  PenLine,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  GripVertical,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

interface CreateQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'manual' | 'ai';
  tenantId: string;
  onSuccess?: () => void;
}

interface Question {
  id: string;
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTI_SELECT' | 'FILE_UPLOAD' | 'URL' | 'DATE' | 'NUMBER';
  title: string;
  description?: string;
  required: boolean;
  options?: string[]; // For SELECT/MULTI_SELECT
}

const questionTypes = [
  { value: 'TEXT', label: 'Short Text', description: 'Single line text input' },
  { value: 'TEXTAREA', label: 'Long Text', description: 'Multi-line text area' },
  { value: 'SELECT', label: 'Single Choice', description: 'Dropdown with one selection' },
  { value: 'MULTI_SELECT', label: 'Multiple Choice', description: 'Select multiple options' },
  { value: 'NUMBER', label: 'Number', description: 'Numeric input' },
  { value: 'DATE', label: 'Date', description: 'Date picker' },
  { value: 'URL', label: 'URL', description: 'Website link input' },
  { value: 'FILE_UPLOAD', label: 'File Upload', description: 'Attach files' },
] as const;

const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 'default-1',
    type: 'TEXT',
    title: 'What is the name of your project?',
    description: 'Please provide a short, memorable name for your project.',
    required: true,
  },
  {
    id: 'default-2',
    type: 'TEXTAREA',
    title: 'Please describe your project in detail',
    description: 'What are the main goals and objectives? What problem are you trying to solve?',
    required: true,
  },
  {
    id: 'default-3',
    type: 'SELECT',
    title: 'What is your expected timeline?',
    required: true,
    options: ['1-2 weeks', '1 month', '2-3 months', '3-6 months', '6+ months', 'Flexible'],
  },
  {
    id: 'default-4',
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
  },
  {
    id: 'default-5',
    type: 'MULTI_SELECT',
    title: 'What features or systems do you need?',
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
  },
  {
    id: 'default-6',
    type: 'URL',
    title: 'Do you have any reference websites or examples?',
    description: 'Share links to websites or apps that inspire you.',
    required: false,
  },
  {
    id: 'default-7',
    type: 'TEXTAREA',
    title: 'Is there anything else you would like us to know?',
    description: 'Any additional information, concerns, or questions.',
    required: false,
  },
];

export function CreateQuestionnaireModal({
  isOpen,
  onClose,
  mode,
  tenantId,
  onSuccess,
}: CreateQuestionnaireModalProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // AI mode state
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);

  // Manual mode state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);

  // Initialize questions for manual mode
  useEffect(() => {
    if (isOpen && mode === 'manual' && questions.length === 0) {
      setQuestions([...DEFAULT_QUESTIONS.map((q) => ({ ...q, id: crypto.randomUUID() }))]);
      setName('New Questionnaire Template');
      setDescription('A standard project intake questionnaire.');
    }
  }, [isOpen, mode]);

  const resetForm = () => {
    setStep(1);
    setName('');
    setDescription('');
    setTags([]);
    setTagInput('');
    setAiPrompt('');
    setGeneratedQuestions([]);
    setQuestions([]);
    setCurrentQuestion(null);
    setShowQuestionEditor(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a description for your questionnaire');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/questionnaires/templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          tenantId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate questionnaire');
      }

      const data = await response.json();
      setGeneratedQuestions(data.questions || []);
      setName(data.suggestedName || 'AI Generated Questionnaire');
      setDescription(data.suggestedDescription || '');
      setStep(2);
      toast.success('Questionnaire generated! Review and edit as needed.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a questionnaire name');
      return;
    }

    const questionsToSave = mode === 'ai' ? generatedQuestions : questions;

    if (questionsToSave.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    setIsLoading(true);

    try {
      // Create the template
      const templateResponse = await fetch('/api/questionnaires/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (!templateResponse.ok) {
        const data = await templateResponse.json();
        throw new Error(data.error || 'Failed to create questionnaire');
      }

      const { template } = await templateResponse.json();

      // Add questions to the template
      for (let i = 0; i < questionsToSave.length; i++) {
        const q = questionsToSave[i];
        const questionResponse = await fetch(
          `/api/questionnaires/templates/${template.id}/questions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: q.type,
              title: q.title,
              description: q.description || undefined,
              order: i + 1,
              required: q.required,
              config:
                q.type === 'SELECT' || q.type === 'MULTI_SELECT'
                  ? {
                      type: q.type,
                      options: (q.options || []).map((opt) => ({ value: opt, label: opt })),
                    }
                  : { type: q.type },
            }),
          }
        );

        if (!questionResponse.ok) {
          console.warn(`Failed to add question ${i + 1}`);
        }
      }

      toast.success('Questionnaire created successfully!');
      onSuccess?.();
      handleClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const addNewQuestion = (type: Question['type']) => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type,
      title: '',
      description: '',
      required: false,
      options: type === 'SELECT' || type === 'MULTI_SELECT' ? ['Option 1'] : undefined,
    };
    setCurrentQuestion(newQuestion);
    setShowQuestionEditor(true);
  };

  const saveQuestion = () => {
    if (!currentQuestion || !currentQuestion.title.trim()) {
      toast.error('Please enter a question title');
      return;
    }

    const existingIndex = questions.findIndex((q) => q.id === currentQuestion.id);
    if (existingIndex >= 0) {
      const updated = [...questions];
      updated[existingIndex] = currentQuestion;
      setQuestions(updated);
    } else {
      setQuestions([...questions, currentQuestion]);
    }

    setShowQuestionEditor(false);
    setCurrentQuestion(null);
  };

  const editQuestion = (question: Question) => {
    setCurrentQuestion({ ...question });
    setShowQuestionEditor(true);
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
    if (mode === 'ai') {
      setGeneratedQuestions(generatedQuestions.filter((q) => q.id !== id));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                mode === 'ai'
                  ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20'
                  : 'bg-primary/10'
              }`}
            >
              {mode === 'ai' ? (
                <Sparkles className="w-5 h-5 text-purple-500" />
              ) : (
                <PenLine className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {mode === 'ai' ? 'Generate with AI' : 'Create Questionnaire'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {mode === 'ai' ? 'Step ' + step + ' of 2' : 'Step ' + step + ' of 2'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* AI Mode - Step 1: Prompt */}
          {mode === 'ai' && step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Describe your questionnaire
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Create a questionnaire for onboarding new web development clients. Include questions about their project goals, timeline, budget, and technical requirements..."
                  rows={6}
                  className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Be specific about the type of information you want to collect.
                </p>
              </div>
            </div>
          )}

          {/* AI Mode - Step 2: Review Generated Questions */}
          {mode === 'ai' && step === 2 && (
            <div className="space-y-6">
              {/* Name & Description */}
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Questionnaire name"
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description (optional)"
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              {/* Questions List */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Generated Questions ({generatedQuestions.length})
                </label>
                <div className="space-y-2">
                  {generatedQuestions.map((q, index) => (
                    <div
                      key={q.id}
                      className="flex items-start gap-3 p-3 bg-background border border-border rounded-xl"
                    >
                      <span className="text-xs font-medium text-muted-foreground w-6 pt-0.5">
                        {index + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{q.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {questionTypes.find((t) => t.value === q.type)?.label} •{' '}
                          {q.required ? 'Required' : 'Optional'}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Manual Mode - Step 1: Basic Info */}
          {mode === 'manual' && step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Web Development Project Intake"
                  className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this questionnaire is for..."
                  rows={3}
                  className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add a tag..."
                    className="flex-1 px-4 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2.5 bg-muted hover:bg-muted/80 border border-input rounded-xl text-sm transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Manual Mode - Step 2: Add Questions */}
          {mode === 'manual' && step === 2 && !showQuestionEditor && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Questions ({questions.length})
                </label>
              </div>

              {/* Questions List */}
              {questions.length > 0 && (
                <div className="space-y-2">
                  {questions.map((q, index) => (
                    <div
                      key={q.id}
                      className="flex items-start gap-3 p-3 bg-background border border-border rounded-xl group"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 cursor-grab" />
                      <span className="text-xs font-medium text-muted-foreground w-6 pt-0.5">
                        {index + 1}.
                      </span>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => editQuestion(q)}
                      >
                        <p className="text-sm font-medium text-foreground">{q.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {questionTypes.find((t) => t.value === q.type)?.label} •{' '}
                          {q.required ? 'Required' : 'Optional'}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Question Type Selector */}
              <div className="border border-dashed border-border rounded-xl p-4">
                <p className="text-sm font-medium text-foreground mb-3">Add a question</p>
                <div className="grid grid-cols-2 gap-2">
                  {questionTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => addNewQuestion(type.value)}
                      className="flex flex-col items-start p-3 bg-background hover:bg-muted border border-border rounded-lg transition-colors text-left"
                    >
                      <span className="text-sm font-medium text-foreground">{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Question Editor */}
          {mode === 'manual' && step === 2 && showQuestionEditor && currentQuestion && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowQuestionEditor(false);
                    setCurrentQuestion(null);
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to questions
                </button>
                <span className="text-sm text-muted-foreground">
                  {questionTypes.find((t) => t.value === currentQuestion.type)?.label}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Question Title *
                </label>
                <input
                  type="text"
                  value={currentQuestion.title}
                  onChange={(e) =>
                    setCurrentQuestion({ ...currentQuestion, title: e.target.value })
                  }
                  placeholder="Enter your question..."
                  className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={currentQuestion.description || ''}
                  onChange={(e) =>
                    setCurrentQuestion({ ...currentQuestion, description: e.target.value })
                  }
                  placeholder="Add help text for this question..."
                  className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              {/* Options for SELECT/MULTI_SELECT */}
              {(currentQuestion.type === 'SELECT' || currentQuestion.type === 'MULTI_SELECT') && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Options</label>
                  <div className="space-y-2">
                    {(currentQuestion.options || []).map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...(currentQuestion.options || [])];
                            newOptions[index] = e.target.value;
                            setCurrentQuestion({ ...currentQuestion, options: newOptions });
                          }}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1 px-4 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                        {(currentQuestion.options?.length || 0) > 1 && (
                          <button
                            onClick={() => {
                              const newOptions = (currentQuestion.options || []).filter(
                                (_, i) => i !== index
                              );
                              setCurrentQuestion({ ...currentQuestion, options: newOptions });
                            }}
                            className="p-2.5 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newOptions = [
                          ...(currentQuestion.options || []),
                          `Option ${(currentQuestion.options?.length || 0) + 1}`,
                        ];
                        setCurrentQuestion({ ...currentQuestion, options: newOptions });
                      }}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add option
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentQuestion.required}
                    onChange={(e) =>
                      setCurrentQuestion({ ...currentQuestion, required: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                </label>
                <span className="text-sm text-foreground">Required question</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-between items-center flex-shrink-0">
          <div>
            {step > 1 && !showQuestionEditor && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>

            {/* AI Mode Actions */}
            {mode === 'ai' && step === 1 && (
              <button
                onClick={handleGenerateWithAI}
                disabled={isLoading || !aiPrompt.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Questions
                  </>
                )}
              </button>
            )}

            {mode === 'ai' && step === 2 && (
              <button
                onClick={handleSaveTemplate}
                disabled={isLoading}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-primary/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Questionnaire'
                )}
              </button>
            )}

            {/* Manual Mode Actions */}
            {mode === 'manual' && step === 1 && (
              <button
                onClick={() => setStep(2)}
                disabled={!name.trim()}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-primary/20"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {mode === 'manual' && step === 2 && showQuestionEditor && (
              <button
                onClick={saveQuestion}
                disabled={!currentQuestion?.title.trim()}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-primary/20"
              >
                Save Question
              </button>
            )}

            {mode === 'manual' && step === 2 && !showQuestionEditor && (
              <button
                onClick={handleSaveTemplate}
                disabled={isLoading || questions.length === 0}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-primary/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Questionnaire'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
