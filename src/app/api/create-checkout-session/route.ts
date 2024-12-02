// app/api/create-checkout-session/route.ts
import { getServerSession } from 'next-auth/next';
import { stripe } from '@/app/lib/stripe-admin';
import { NextResponse } from 'next/server';
import { SubscriptionTier, SUBSCRIPTION_PRICES } from '@/app/types/subscription';

const DOMAIN = process.env.NEXT_PUBLIC_APP_URL;

export async function POST(request: Request) {
  try {
    // Validate environment variables
    if (!DOMAIN) {
      console.error('Missing NEXT_PUBLIC_APP_URL environment variable');
      return new NextResponse('Configuration Error', { status: 500 });
    }

    const session = await getServerSession();
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const tier = body.tier as SubscriptionTier;

    if (!tier || !SUBSCRIPTION_PRICES[tier]) {
      console.error('Invalid tier received:', tier);
      return new NextResponse('Invalid subscription tier', { status: 400 });
    }

    const priceId = SUBSCRIPTION_PRICES[tier];

    try {
      // Create or retrieve Stripe customer
      const customers = await stripe.customers.list({
        email: session.user.email,
        limit: 1
      });

      const customerId = customers.data.length
        ? customers.data[0].id
        : (
            await stripe.customers.create({
              email: session.user.email,
              metadata: {
                userId: session.user.email
              }
            })
          ).id;

      // Create checkout session with additional options
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        metadata: {
          tier,
          userId: session.user.email
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        success_url: `${DOMAIN}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${DOMAIN}?canceled=true`
      });

      if (!checkoutSession?.url) {
        throw new Error('Failed to create checkout session URL');
      }

      return NextResponse.json({ url: checkoutSession.url });
    } catch (stripeError) {
      console.error('Stripe API Error:', stripeError);
      return new NextResponse('Payment Provider Error', { status: 502 });
    }
  } catch (error) {
    console.error('Server Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
