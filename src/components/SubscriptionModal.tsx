'use client';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

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
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4">Scan Limit Reached</h2>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            You&apos;ve reached your monthly scan limit. Upgrade to our Pro or Premium plan to continue
            analyzing resumes and unlock additional features.
          </p>

          <div className="p-6 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold mb-2">
              Starting at $10<span className="text-lg text-gray-600">/month</span>
            </div>
            <ul className="space-y-2">
              <li className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Up to 100 resume scans per month
              </li>
              <li className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Advanced ATS analysis
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
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Upgrade Now'}
        </button>

        <button
          onClick={() => !loading && onClose()}
          disabled={loading}
          className="mt-4 w-full py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
