// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import { stripe } from '@/app/lib/stripe-admin';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateUserSubscription, updateSubscriptionStatus } from '@/app/lib/subscription';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const err = error as Error;
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  switch (event.type) {
    case 'checkout.session.completed':
      // Add user subscription to database
      await updateUserSubscription(session);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      // Update subscription in database
      await updateSubscriptionStatus(subscription);
      break;
  }

  return new NextResponse(null, { status: 200 });
}
