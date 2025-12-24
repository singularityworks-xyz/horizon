'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { InviteClientModal } from './invite-client-modal';
import { useRouter } from 'next/navigation';

export function InviteClientButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    // Refresh the page to show the new client
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md shadow-primary/20"
      >
        <UserPlus className="w-4 h-4" />
        Invite Client
      </button>

      <InviteClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
