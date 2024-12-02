// app/types/subscription.ts
export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  PREMIUM = 'premium'
}

export const SUBSCRIPTION_PRICES = {
  [SubscriptionTier.FREE]: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FREE,
  [SubscriptionTier.PRO]: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO,
  [SubscriptionTier.PREMIUM]: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM
};
export const SUBSCRIPTION_LIMITS = {
  [SubscriptionTier.FREE]: 3,
  [SubscriptionTier.PRO]: 25,
  [SubscriptionTier.PREMIUM]: 100
};

export const STRIPE_PRICE_TO_TIER = {
  [process.env.STRIPE_PRICE_ID_FREE!]: SubscriptionTier.FREE,
  [process.env.STRIPE_PRICE_ID_PRO!]: SubscriptionTier.PRO,
  [process.env.STRIPE_PRICE_ID_PREMIUM!]: SubscriptionTier.PREMIUM
};
