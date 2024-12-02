// components/HistoryModal.tsx
import { useState, useEffect } from 'react';

type AnalysisHistory = {
  id: string;
  createdAt: string;
  overallScore: number;
  requirementsScore: number;
  keywordsScore: number;
  fileName: string;
};

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/scans/history');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="relative bg-[var(--card-background)] rounded-lg max-w-4xl w-full mx-auto shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--card-border)]">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Resume Analysis History</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[var(--background)] p-4 rounded-lg border border-[var(--card-border)]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-[var(--text-primary)]">{item.fileName}</h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <p className="text-sm text-[var(--text-secondary)]">Overall</p>
                          <p
                            className="font-semibold"
                            style={{ color: `hsl(${item.overallScore}, 70%, 50%)` }}
                          >
                            {item.overallScore}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-[var(--text-secondary)]">Requirements</p>
                          <p
                            className="font-semibold"
                            style={{ color: `hsl(${item.requirementsScore}, 70%, 50%)` }}
                          >
                            {item.requirementsScore}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-[var(--text-secondary)]">Keywords</p>
                          <p
                            className="font-semibold"
                            style={{ color: `hsl(${item.keywordsScore}, 70%, 50%)` }}
                          >
                            {item.keywordsScore}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[var(--text-secondary)]">No analysis history found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
