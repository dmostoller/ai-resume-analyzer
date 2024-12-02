'use client';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

export function useLatestScan() {
  const [lastScanScore, setLastScanScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLatestScan = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scans/latest');
      const data = await response.json();
      if (data?.overallScore) {
        setLastScanScore(data.overallScore);
      }
    } catch (error) {
      console.error('Error fetching scan data:', error);
      toast.error('Failed to load scan data');
    } finally {
      setLoading(false);
    }
  };

  return { lastScanScore, loading, fetchLatestScan };
}
