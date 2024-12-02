// app/api/subscription/route.ts
import { getServerSession } from 'next-auth/next';
import { stripe } from '@/app/lib/stripe-admin';
import { NextResponse } from 'next/server';
import { Subscription } from '@/app/types/stripe';
import { getUserSubscription } from '@/app/lib/db';
import { SUBSCRIPTION_LIMITS, STRIPE_PRICE_TO_TIER } from '@/app/types/subscription';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ isSubscribed: false });
    }

    // Check for paid subscription first
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1
    });

    let subscriptionData: Subscription = {
      id: '',
      userId: '',
      status: 'inactive',
      priceId: '',
      tier: 'free',
      quantity: 0,
      cancelAtPeriodEnd: false,
      created: '',
      currentPeriodStart: '',
      currentPeriodEnd: '',
      endedAt: undefined,
      cancelAt: undefined,
      usage: 0,
      limit: SUBSCRIPTION_LIMITS.free,
      plan: { tier: 'free', limit: SUBSCRIPTION_LIMITS.free }
    };

    // Get usage from Redis regardless of subscription status
    const redisSubscription = await getUserSubscription(session.user.email);
    const currentUsage = redisSubscription?.usage || 0;

    if (customers.data.length) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: 'active',
        expand: ['data.items.data.price']
      });

      if (subscriptions.data.length) {
        const subscription = subscriptions.data[0];
        const priceId = subscription.items.data[0].price.id;
        const tier = STRIPE_PRICE_TO_TIER[priceId] || 'free';
        const limit = SUBSCRIPTION_LIMITS[tier];

        subscriptionData = {
          id: subscription.id,
          userId: customers.data[0].id,
          status: subscription.status,
          priceId: priceId,
          tier: tier,
          quantity: subscription.items.data[0].quantity || 0,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          created: new Date(subscription.created * 1000).toISOString(),
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : undefined,
          cancelAt: subscription.cancel_at
            ? new Date(subscription.cancel_at * 1000).toISOString()
            : undefined,
          usage: currentUsage,
          limit: limit,
          plan: { tier, limit }
        };
      }
    }

    // If no paid subscription found, return free tier data
    if (!subscriptionData) {
      subscriptionData = {
        id: '',
        userId: '',
        status: 'active',
        priceId: '',
        tier: 'free',
        quantity: 0,
        cancelAtPeriodEnd: false,
        created: '',
        currentPeriodStart: '',
        currentPeriodEnd: '',
        endedAt: undefined,
        cancelAt: undefined,
        usage: currentUsage,
        limit: SUBSCRIPTION_LIMITS.free,
        plan: { tier: 'free', limit: SUBSCRIPTION_LIMITS.free }
      };
    }

    return NextResponse.json({
      isSubscribed: true, // Always true if user is signed in
      subscription: subscriptionData,
      usage: currentUsage
    });
  } catch (error) {
    console.error('Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
