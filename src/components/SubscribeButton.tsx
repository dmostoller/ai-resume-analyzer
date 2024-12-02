// app/components/SubscribeButton.tsx
'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { SubscriptionTier } from '@/app/types/subscription';

interface SubscribeButtonProps {
  tier: SubscriptionTier;
  className?: string;
  disabled?: boolean;
  currentPlan: SubscriptionTier | 'free';
}

export function SubscribeButton({ tier, className, disabled, currentPlan }: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  const getButtonText = () => {
    if (loading) return 'Loading...';
    if (disabled) return 'Current Plan';

    // For Premium tier button
    if (tier === SubscriptionTier.PREMIUM) {
      return 'Upgrade to Premium';
    }

    // For Pro tier button
    if (disabled === false && currentPlan === SubscriptionTier.PREMIUM) {
      return 'Downgrade to Pro';
    }

    return 'Upgrade to Pro';
  };

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tier })
      });
      const data = await response.json();

      window.location.href = data.url;
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading || !session || disabled}
      className={`${className || 'w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {getButtonText()}
    </button>
  );
}
