// app/lib/stripe-admin.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true
});

export async function getOrCreateStripeCustomer(email: string, name: string) {
  const customers = await stripe.customers.list({ email });

  if (customers.data.length) return customers.data[0];

  return stripe.customers.create({
    email,
    name
  });
}
