'use client';

import { ClipboardList, MoreHorizontal, Eye, Pencil, Trash2, Tag } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface QuestionnaireCardProps {
  id: string;
  name: string;
  description?: string | null;
  tags?: string[];
  questionCount: number;
  submissionCount: number;
  isActive: boolean;
  createdAt: Date;
  onDelete?: (id: string) => void;
}

const tagColors: Record<string, string> = {
  'web dev': 'bg-blue-500/10 text-blue-500',
  'mobile dev': 'bg-purple-500/10 text-purple-500',
  design: 'bg-pink-500/10 text-pink-500',
  onboarding: 'bg-green-500/10 text-green-500',
  feedback: 'bg-amber-500/10 text-amber-500',
  default: 'bg-primary/10 text-primary',
};

export function QuestionnaireCard({
  id,
  name,
  description,
  tags = [],
  questionCount,
  submissionCount,
  isActive,
  createdAt,
  onDelete,
}: QuestionnaireCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getTagColor = (tag: string) => {
    const lowerTag = tag.toLowerCase();
    return tagColors[lowerTag] || tagColors.default;
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-all duration-200 group relative">
      {/* Header Row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground line-clamp-1">{name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  isActive ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                }`}
              >
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-xl shadow-lg shadow-black/10 py-1 z-10">
              <Link
                href={`/admin/questionnaire/${id}` as any}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <Eye className="w-4 h-4" />
                View
              </Link>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onDelete?.(id);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{description}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, index) => (
            <span
              key={index}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{questionCount}</p>
          <p className="text-xs text-muted-foreground">Questions</p>
        </div>
        <div className="w-px h-10 bg-border"></div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{submissionCount}</p>
          <p className="text-xs text-muted-foreground">Submissions</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground">Created</p>
          <p className="text-sm font-medium text-foreground">{formatDate(createdAt)}</p>
        </div>
      </div>
    </div>
  );
}
