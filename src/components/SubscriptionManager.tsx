// app/components/SubscriptionManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SettingsGearIcon } from './icons/gear';
import { toast } from 'react-hot-toast';
import { Subscription } from '@/app/types/stripe';
import Image from 'next/image';
import { PlanTier } from '@/app/types/stripe';

// SubscriptionManager.tsx
interface SubscriptionDetails {
  isSubscribed: boolean;
  subscription?: Subscription & {
    plan?: {
      tier: PlanTier | 'free';
      limit: number;
    };
  };
  usage: number;
}
const PLAN_DISPLAY_NAME: Record<PlanTier, string> = {
  free: 'Free Plan',
  pro: 'Pro Plan',
  premium: 'Premium Plan'
} as const;

export function SubscriptionManager() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (showModal) {
      fetchSubscriptionDetails();
    }
  }, [showModal]);

  const fetchSubscriptionDetails = async () => {
    try {
      const response = await fetch('/api/subscription');
      const data = await response.json();

      if (data.isSubscribed && data.subscription?.priceId) {
        // Compare with environment price IDs
        const proPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO;
        const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM;

        // Enhance subscription data with plan tier
        const enhancedData = {
          ...data,
          subscription: {
            id: '',
            userId: '',
            status: '',
            priceId: '',
            created: 0,
            currentPeriodStart: 0,
            currentPeriodEnd: 0,
            ...data.subscription,
            plan: {
              tier:
                data.subscription.priceId === proPriceId
                  ? 'pro'
                  : data.subscription.priceId === premiumPriceId
                    ? 'premium'
                    : 'free',
              limit:
                data.subscription.priceId === proPriceId
                  ? 100
                  : data.subscription.priceId === premiumPriceId
                    ? 1000
                    : 10
            }
          }
        };

        setSubscription(enhancedData);
      } else {
        // Set free tier data if no subscription
        setSubscription({
          isSubscribed: false,
          subscription: {
            id: '',
            userId: '',
            status: '',
            priceId: '',
            created: '',
            currentPeriodStart: '',
            currentPeriodEnd: '',
            tier: 'free',
            quantity: 0,
            cancelAtPeriodEnd: false,
            usage: 0,
            limit: 10,
            plan: {
              tier: 'free',
              limit: 10
            }
          },
          usage: data.usage || 0
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error('Failed to load subscription details');

      // Set default free tier on error
      setSubscription({
        isSubscribed: false,
        subscription: {
          id: '',
          userId: '',
          status: '',
          priceId: '',
          created: '',
          currentPeriodStart: '',
          currentPeriodEnd: '',
          tier: 'free',
          quantity: 0,
          cancelAtPeriodEnd: false,
          usage: 0,
          limit: 10,
          plan: {
            tier: 'free',
            limit: 10
          }
        },
        usage: 0
      });
    }
  };

  const handlePortal = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div>
        <button onClick={() => setShowModal(true)} className="p-2 hover:bg-gray-100 rounded-full">
          <SettingsGearIcon />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Account Settings</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
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
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Profile</h3>
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
                  <p className="font-medium">{session?.user?.name}</p>
                  <p className="text-sm text-gray-600">{session?.user?.email}</p>
                </div>
              </div>
            </div>

            {subscription ? (
              <div className="space-y-6">
                {/* Subscription Status */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Subscription Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span
                        className={`px-2 py-1 rounded-full text-sm font-medium inline-block mt-1 ${getStatusColor(subscription.subscription?.status)}`}
                      >
                        {subscription.subscription?.status || 'No subscription'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Plan</p>
                      <p className="font-medium">
                        {PLAN_DISPLAY_NAME[subscription.subscription?.plan?.tier || 'free']}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Started On</p>
                      <p className="font-medium">
                        {subscription.subscription?.created
                          ? new Date(subscription.subscription.created).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Next Billing Date</p>
                      <p className="font-medium">
                        {subscription.subscription?.currentPeriodEnd
                          ? new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Usage Section */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Usage</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Monthly Scans</span>
                        <span className="font-medium">
                          {subscription.usage} / {subscription.subscription?.plan?.limit || 'N/A'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min((subscription.usage / (subscription.subscription?.plan?.limit || 1)) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Resets on{' '}
                      {new Date(subscription.subscription?.currentPeriodEnd || '').toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handlePortal}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 
                    transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : 'Manage Billing'}
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
