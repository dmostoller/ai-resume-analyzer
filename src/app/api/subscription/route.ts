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

    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1
    });

    if (!customers.data.length) {
      return NextResponse.json({ isSubscribed: false });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: 'active',
      expand: ['data.items.data.price']
    });

    if (!subscriptions.data.length) {
      return NextResponse.json({ isSubscribed: false });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;
    const tier = STRIPE_PRICE_TO_TIER[priceId] || 'free';
    const limit = SUBSCRIPTION_LIMITS[tier] || 0;

    // Get usage from Redis
    const redisSubscription = await getUserSubscription(session.user.email);
    const currentUsage = redisSubscription?.usage || 0;

    const subscriptionData: Subscription = {
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
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : undefined,
      usage: currentUsage,
      limit: limit,
      plan: { tier, limit }
    };

    return NextResponse.json({
      isSubscribed: true,
      subscription: subscriptionData,
      usage: currentUsage
    });
  } catch (error) {
    console.error('Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
