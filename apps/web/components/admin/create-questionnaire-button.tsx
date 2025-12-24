'use client';

import { useState } from 'react';
import { Plus, Sparkles, PenLine } from 'lucide-react';

interface CreateQuestionnaireButtonProps {
  onCreateManual: () => void;
  onCreateWithAI: () => void;
}

export function CreateQuestionnaireButton({
  onCreateManual,
  onCreateWithAI,
}: CreateQuestionnaireButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md shadow-primary/20"
      >
        <Plus className="w-4 h-4" />
        Create New
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-xl shadow-lg shadow-black/10 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              onClick={() => {
                setShowDropdown(false);
                onCreateWithAI();
              }}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Generate with AI</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Describe your needs and let AI create questions
                </p>
              </div>
            </button>

            <div className="my-1 mx-4 border-t border-border"></div>

            <button
              onClick={() => {
                setShowDropdown(false);
                onCreateManual();
              }}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <PenLine className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Create Manually</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Build your questionnaire from scratch
                </p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
