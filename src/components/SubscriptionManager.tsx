// app/components/SubscriptionManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SettingsGearIcon } from './icons/gear';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { PlanTier } from '@/app/types/stripe';
import { useSubscription } from '@/app/hooks/useSubscription';

const PLAN_DISPLAY_NAME: Record<PlanTier, string> = {
  free: 'Free Plan',
  pro: 'Pro Plan',
  premium: 'Premium Plan'
} as const;

export function SubscriptionManager() {
  const [showModal, setShowModal] = useState(false);
  const { subscription, loading, fetchSubscriptionDetails } = useSubscription();
  const [buttonLoading, setButtonLoading] = useState(false);

  const { data: session } = useSession();

  useEffect(() => {
    if (showModal) {
      fetchSubscriptionDetails();
    }
  }, [showModal]);

  const handlePortal = async () => {
    try {
      setButtonLoading(true);
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { url } = await response.json();

      if (!url) {
        throw new Error('No portal URL received');
      }

      // Open in new tab
      window.open(url, '_blank');
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open subscription portal');
    } finally {
      setButtonLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-[var(--gray-100)] text-[var(--text-primary)]';
    }
  };

  return (
    <>
      <div>
        <button
          onClick={() => setShowModal(true)}
          className="text-base font-medium 
          rounded-full shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 
          hover:from-blue-700 hover:to-indigo-700 px-0 py-0 transition-all duration-300 ease-in-out"
        >
          <SettingsGearIcon />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--card-background)] border border-[var(--card-border)] rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Account Settings</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* User Profile Section */}
            <div className="mb-6 p-4 bg-[var(--gray-50)] rounded-lg border border-[var(--card-border)]">
              <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Profile</h3>
              <div className="flex items-center space-x-4">
                {session?.user?.image && (
                  <Image
                    src={session.user.image}
                    alt="Profile"
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{session?.user?.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{session?.user?.email}</p>
                </div>
              </div>
            </div>

            {subscription ? (
              <div className="space-y-6">
                {/* Subscription Status */}
                <div className="p-4 bg-[var(--gray-50)] rounded-lg border border-[var(--card-border)]">
                  <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
                    Subscription Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">Status</p>
                      <span
                        className={`px-2 py-1 rounded-full text-sm font-medium inline-block mt-1 ${getStatusColor(subscription.subscription?.status)}`}
                      >
                        {subscription.subscription?.status || 'No subscription'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">Plan</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {PLAN_DISPLAY_NAME[subscription.subscription?.plan?.tier || 'free']}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">Started On</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {subscription.subscription?.created
                          ? new Date(subscription.subscription.created).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">Next Billing Date</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {subscription.subscription?.currentPeriodEnd
                          ? new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Usage Section */}
                <div className="p-4 bg-[var(--gray-50)] rounded-lg border border-[var(--card-border)]">
                  <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Usage</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-[var(--text-secondary)]">Monthly Scans</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {subscription.usage} / {subscription.subscription?.plan?.limit || 'N/A'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[var(--gray-100)] rounded-full">
                        <div
                          className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min((subscription.usage / (subscription.subscription?.plan?.limit || 1)) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Resets on{' '}
                      {new Date(subscription.subscription?.currentPeriodEnd || '').toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handlePortal}
                  disabled={buttonLoading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 
                    transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {buttonLoading ? 'Loading...' : 'Manage Billing'}
                </button>
              </div>
            ) : (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
