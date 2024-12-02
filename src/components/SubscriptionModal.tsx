'use client';
import { useState } from 'react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export function SubscriptionModal({ isOpen, onClose, onUpgrade }: SubscriptionModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[var(--card-background)] border border-[var(--card-border)] p-8 rounded-xl shadow-lg max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Scan Limit Reached</h2>

        <div className="mb-6">
          <p className="text-[var(--text-secondary)] mb-4">
            You&apos;ve reached your monthly scan limit. Upgrade to our Pro or Premium plan to continue
            analyzing resumes and unlock additional features.
          </p>

          <div className="p-6 bg-[var(--gray-50)] rounded-lg border border-[var(--card-border)]">
            <div className="text-3xl font-bold mb-2 text-[var(--text-primary)]">
              Starting at $10
              <span className="text-lg text-[var(--text-secondary)]">/month</span>
            </div>
            <ul className="space-y-2">
              <li className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-500 dark:text-green-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-primary)]">Up to 100 resume scans per month</span>
              </li>
              <li className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-500 dark:text-green-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-primary)]">Advanced ATS analysis</span>
              </li>
            </ul>
          </div>
        </div>

        <button
          onClick={() => {
            if (!loading) {
              onClose();
              onUpgrade();
            }
          }}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 
            transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Upgrade Now'}
        </button>

        <button
          onClick={() => !loading && onClose()}
          disabled={loading}
          className="mt-4 w-full py-2 text-[var(--text-secondary)] 
            hover:text-[var(--text-primary)] transition-colors 
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
