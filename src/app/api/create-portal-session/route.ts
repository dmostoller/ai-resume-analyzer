// app/api/create-portal-session/route.ts
import { getServerSession } from 'next-auth/next';
import { stripe } from '@/app/lib/stripe-admin';
import { NextResponse } from 'next/server';
import { getOrCreateStripeCustomer } from '@/app/lib/stripe-admin';

export async function POST() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const customer = await getOrCreateStripeCustomer(session.user.email, session.user.name || '');

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}`
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
