'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  MoreHorizontal,
  FileText,
  Hash,
  Calendar,
  Link as LinkIcon,
  Upload,
  ListOrdered,
  CheckSquare,
  ArrowLeft,
  Pencil,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  type: string;
  title: string;
  description: string | null;
  config: Record<string, unknown> | null;
  order: number;
  required: boolean;
  answerCount: number;
}

interface QuestionnaireData {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  project: { id: string; name: string } | null;
  submissionCount: number;
  questions: Question[];
}

interface QuestionnaireDetailProps {
  questionnaire: QuestionnaireData;
}

const questionTypeIcons: Record<string, typeof FileText> = {
  TEXT: FileText,
  TEXTAREA: FileText,
  SELECT: ListOrdered,
  MULTI_SELECT: CheckSquare,
  NUMBER: Hash,
  DATE: Calendar,
  URL: LinkIcon,
  FILE_UPLOAD: Upload,
};

const questionTypeLabels: Record<string, string> = {
  TEXT: 'Short Text',
  TEXTAREA: 'Long Text',
  SELECT: 'Single Choice',
  MULTI_SELECT: 'Multiple Choice',
  NUMBER: 'Number',
  DATE: 'Date',
  URL: 'URL',
  FILE_UPLOAD: 'File Upload',
};

export function QuestionnaireDetail({ questionnaire }: QuestionnaireDetailProps) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(questionnaire.isActive);
  const [isUpdating, setIsUpdating] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const handleToggleActive = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/questionnaires/templates?id=${questionnaire.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      setIsActive(!isActive);
      toast.success(`Questionnaire ${!isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update';
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/questionnaires/templates/${questionnaire.id}/questions?questionId=${questionId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete question');
      }

      toast.success('Question deleted');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/admin/questionnaire"
            className="mt-1 p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{questionnaire.name}</h1>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    isActive ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {questionnaire.description && (
                <p className="text-sm text-muted-foreground mt-1">{questionnaire.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleActive}
            disabled={isUpdating}
            className="px-4 py-2 flex items-center gap-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            {isActive ? (
              <>
                <ToggleRight className="w-4 h-4" />
                Deactivate
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4" />
                Activate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm text-muted-foreground mb-1">Version</p>
          <p className="text-2xl font-bold text-foreground">{questionnaire.version}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm text-muted-foreground mb-1">Questions</p>
          <p className="text-2xl font-bold text-foreground">{questionnaire.questions.length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm text-muted-foreground mb-1">Submissions</p>
          <p className="text-2xl font-bold text-foreground">{questionnaire.submissionCount}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
          <p className="text-sm font-medium text-foreground">
            {formatDate(questionnaire.updatedAt)}
          </p>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Questions</h2>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>

        {questionnaire.questions.length > 0 ? (
          <div className="divide-y divide-border">
            {questionnaire.questions.map((question, index) => {
              const Icon = questionTypeIcons[question.type] || FileText;
              return (
                <div
                  key={question.id}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-muted/20 transition-colors group"
                >
                  <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                    <GripVertical className="w-4 h-4 opacity-0 group-hover:opacity-100 cursor-grab" />
                    <span className="text-sm font-medium w-6">{index + 1}.</span>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {question.title}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    {question.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{question.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="bg-muted/50 px-2 py-0.5 rounded">
                        {questionTypeLabels[question.type] || question.type}
                      </span>
                      {question.answerCount > 0 && <span>{question.answerCount} answers</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenDropdownId(openDropdownId === question.id ? null : question.id)
                      }
                      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {openDropdownId === question.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setOpenDropdownId(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-36 bg-popover border border-border rounded-xl shadow-lg shadow-black/10 py-1 z-50">
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              toast.info('Edit functionality coming soon');
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              handleDeleteQuestion(question.id);
                            }}
                            disabled={question.answerCount > 0}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No questions yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Add questions to your questionnaire to start collecting responses.
            </p>
          </div>
        )}
      </div>
      {/* Add Question Modal */}
      {showAddModal && (
        <AddQuestionModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          questionnaireId={questionnaire.id}
          nextOrder={Math.max(...questionnaire.questions.map((q) => q.order), 0) + 1}
          onSuccess={() => {
            setShowAddModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
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

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionnaireId: string;
  nextOrder: number;
  onSuccess: () => void;
}

function AddQuestionModal({
  isOpen,
  onClose,
  questionnaireId,
  nextOrder,
  onSuccess,
}: AddQuestionModalProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<string>('TEXT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>(['Option 1']);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a question title');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/questionnaires/templates/${questionnaireId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim() || undefined,
          order: nextOrder,
          required,
          config:
            type === 'SELECT' || type === 'MULTI_SELECT'
              ? {
                  type,
                  options: options.map((opt) => ({ value: opt, label: opt })),
                }
              : { type },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add question');
      }

      toast.success('Question added successfully');
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Add Question</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 1 ? (
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm font-medium text-foreground mb-1">
                Select Question Type
              </label>
              {questionTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => {
                    setType(t.value);
                    setStep(2);
                  }}
                  className={`flex flex-col items-start p-3 border rounded-xl transition-all ${
                    type === t.value
                      ? 'bg-primary/5 border-primary'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                >
                  <span className="text-sm font-semibold text-foreground">{t.label}</span>
                  <span className="text-xs text-muted-foreground">{t.description}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <button
                onClick={() => setStep(1)}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Change Type ({questionTypeLabels[type]})
              </button>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter question title..."
                  className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
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
                  placeholder="Helper text (optional)..."
                  className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              {(type === 'SELECT' || type === 'MULTI_SELECT') && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">Options</label>
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...options];
                          newOpts[idx] = e.target.value;
                          setOptions(newOpts);
                        }}
                        className="flex-1 px-4 py-2 bg-background border border-input rounded-xl text-sm"
                      />
                      {options.length > 1 && (
                        <button
                          onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                          className="p-2 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setOptions([...options, `Option ${options.length + 1}`])}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Add Option
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRequired(!required)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${required ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${required ? 'translate-x-5' : ''}`}
                  />
                </button>
                <span className="text-sm text-foreground">Required Question</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          {step === 2 && (
            <button
              onClick={handleSave}
              disabled={isLoading || !title.trim()}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Question'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
