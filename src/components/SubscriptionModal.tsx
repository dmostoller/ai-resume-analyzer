'use client';
import { useState } from 'react';
import { SubscriptionTier, SUBSCRIPTION_LIMITS } from '@/app/types/subscription';
import { FeatureLineItem } from '@/components/shared/FeatureLineItem';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  currentTier: SubscriptionTier;
}

const PremiumUpsell = () => (
  <div className="p-6 bg-[var(--gray-50)] rounded-lg border border-[var(--card-border)]">
    <div className="text-3xl font-bold mb-2 text-[var(--text-primary)]">
      $25<span className="text-lg text-[var(--text-secondary)]">/month</span>
    </div>
    <ul className="space-y-2">
      <FeatureLineItem text={`${SUBSCRIPTION_LIMITS[SubscriptionTier.PREMIUM]} resume scans per month`} />
      <FeatureLineItem text="Advanced ATS optimization" />
      <FeatureLineItem text="Job description matching" />
      <FeatureLineItem text="Detailed feedback" />
      <FeatureLineItem text="Priority support" />
    </ul>
  </div>
);

const ProUpsell = () => (
  <div className="p-6 bg-[var(--gray-50)] rounded-lg border border-[var(--card-border)]">
    <div className="text-3xl font-bold mb-2 text-[var(--text-primary)]">
      $10<span className="text-lg text-[var(--text-secondary)]">/month</span>
    </div>
    <ul className="space-y-2">
      <FeatureLineItem text={`${SUBSCRIPTION_LIMITS[SubscriptionTier.PRO]} resume scans per month`} />
      <FeatureLineItem text="Advanced ATS optimization" />
      <FeatureLineItem text="Job description matching" />
      <FeatureLineItem text="Detailed feedback" />
      <FeatureLineItem text="Priority support" />
    </ul>
  </div>
);

export function SubscriptionModal({ isOpen, onClose, onUpgrade, currentTier }: SubscriptionModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isMaxTier = currentTier === SubscriptionTier.PREMIUM;

  const getTierContent = () => {
    switch (currentTier) {
      case SubscriptionTier.FREE:
        return {
          title: 'Scan Limit Reached',
          description:
            "You've reached your free monthly scan limit. Upgrade to our Pro plan to continue analyzing resumes and unlock additional features.",
          component: <ProUpsell />,
          showUpgrade: true
        };
      case SubscriptionTier.PRO:
        return {
          title: 'Pro Scan Limit Reached',
          description:
            "You've reached your Pro plan monthly scan limit. Upgrade to Premium for increased capacity and priority features.",
          component: <PremiumUpsell />,
          showUpgrade: true
        };
      case SubscriptionTier.PREMIUM:
        return {
          title: 'Premium Scan Limit Reached',
          description:
            "You've reached your Premium plan monthly scan limit. Your limit will reset at the start of your next billing period.",
          component: null,
          showUpgrade: false
        };
      default:
        return {
          title: 'Scan Limit Reached',
          description: "You've reached your monthly scan limit.",
          component: <ProUpsell />,
          showUpgrade: true
        };
    }
  };

  const content = getTierContent();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-[var(--card-background)] border border-[var(--card-border)] p-8 rounded-xl shadow-lg max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">{content.title}</h2>

        <div className="mb-6">
          <p className="text-[var(--text-secondary)] mb-4">{content.description}</p>
          {content.component}
        </div>

        {content.showUpgrade && (
          <button
            onClick={() => {
              if (!loading) {
                onClose();
                onUpgrade();
              }
            }}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Upgrade Now'}
          </button>
        )}

        <button
          onClick={() => !loading && onClose()}
          disabled={loading}
          className="mt-4 w-full py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMaxTier ? 'Close' : 'Maybe later'}
        </button>
      </div>
    </div>
  );
}
