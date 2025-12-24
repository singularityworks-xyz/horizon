'use client';

import { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { QuestionnaireCard } from './questionnaire-card';
import { CreateQuestionnaireButton } from './create-questionnaire-button';
import { CreateQuestionnaireModal } from './create-questionnaire-modal';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Questionnaire {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  questionCount: number;
  submissionCount: number;
  isActive: boolean;
  createdAt: Date;
}

interface QuestionnaireGridProps {
  questionnaires: Questionnaire[];
  tenantId: string;
}

export function QuestionnaireGrid({ questionnaires, tenantId }: QuestionnaireGridProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationMode, setCreationMode] = useState<'manual' | 'ai'>('manual');

  const filteredQuestionnaires = useMemo(() => {
    let filtered = questionnaires;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.name.toLowerCase().includes(term) ||
          q.description?.toLowerCase().includes(term) ||
          q.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    }

    // Active filter
    if (filterActive === 'active') {
      filtered = filtered.filter((q) => q.isActive);
    } else if (filterActive === 'inactive') {
      filtered = filtered.filter((q) => !q.isActive);
    }

    return filtered;
  }, [questionnaires, searchTerm, filterActive]);

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this questionnaire? This action cannot be undone if there are no submissions.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/questionnaires/templates?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete questionnaire');
      }

      toast.success('Questionnaire deleted');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete';
      toast.error(message);
    }
  };

  const handleOpenModal = (mode: 'manual' | 'ai') => {
    setCreationMode(mode);
    setShowCreateModal(true);
  };

  return (
    <>
      {/* Search and Filter Bar */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-md">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search questionnaires..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              {(['all', 'active', 'inactive'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterActive(filter)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filterActive === filter
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            {/* Create Button */}
            <CreateQuestionnaireButton
              onCreateManual={() => handleOpenModal('manual')}
              onCreateWithAI={() => handleOpenModal('ai')}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredQuestionnaires.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuestionnaires.map((questionnaire) => (
            <QuestionnaireCard key={questionnaire.id} {...questionnaire} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-card border border-border rounded-2xl">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {searchTerm || filterActive !== 'all'
                ? 'No questionnaires found'
                : 'No questionnaires yet'}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchTerm || filterActive !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Create your first questionnaire to gather information from your clients.'}
            </p>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CreateQuestionnaireModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        mode={creationMode}
        tenantId={tenantId}
        onSuccess={() => {
          setShowCreateModal(false);
          router.refresh();
        }}
      />
    </>
  );
}
