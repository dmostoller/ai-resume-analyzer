// hooks/useSubscription.ts
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { SubscriptionTier, SUBSCRIPTION_LIMITS } from '@/app/types/subscription';

export interface SubscriptionPlan {
  tier: 'free' | 'pro' | 'premium';
  limit: number;
}

export interface Subscription {
  id: string;
  userId: string;
  status: string;
  priceId: string;
  created: string | number;
  currentPeriodStart: string | number;
  currentPeriodEnd: string | number;
  tier: string;
  quantity: number;
  cancelAtPeriodEnd: boolean;
  usage: number;
  limit: number;
  plan: SubscriptionPlan;
}

export interface SubscriptionDetails {
  isSubscribed: boolean;
  subscription: Subscription;
  usage: number;
}

export function useSubscription() {
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);

  const fetchSubscriptionDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscription');
      const data = await response.json();

      if (data.isSubscribed && data.subscription?.priceId) {
        const getTierFromPriceId = (priceId: string): SubscriptionTier => {
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO) return SubscriptionTier.PRO;
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM) return SubscriptionTier.PREMIUM;
          return SubscriptionTier.FREE;
        };

        const enhancedData = {
          ...data,
          subscription: {
            ...data.subscription,
            plan: {
              tier: getTierFromPriceId(data.subscription.priceId),
              limit: SUBSCRIPTION_LIMITS[getTierFromPriceId(data.subscription.priceId)]
            }
          }
        };

        setSubscription(enhancedData);
      } else {
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
            limit: 3,
            plan: {
              tier: 'free',
              limit: 3
            }
          },
          usage: data.usage || 0
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error('Failed to load subscription details');
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    subscription,
    loading,
    fetchSubscriptionDetails
  };
}
