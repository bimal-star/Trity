'use client';

import { X } from 'lucide-react';
import { premiumTypography } from '@/lib/premiumUi';

interface CostCardModalShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function CostCardModalShell({ title, onClose, children }: CostCardModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <ModalHeader title={title} onClose={onClose} />
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className={`${premiumTypography.pageTitle} text-lg`}>{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
