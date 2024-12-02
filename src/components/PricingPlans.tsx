import { SubscribeButton } from './SubscribeButton';
import { SubscriptionTier } from '@/app/types/subscription';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const PricingPlanSkeleton = () => (
  <div className="border rounded-lg p-6">
    <div className="flex justify-between items-center mb-2">
      <Skeleton width={120} height={24} />
      <Skeleton width={80} height={24} />
    </div>
    <div className="mb-4">
      <Skeleton width={100} height={36} />
    </div>
    <ul className="space-y-3 mb-6">
      {[...Array(5)].map((_, i) => (
        <li key={i} className="flex items-center">
          <Skeleton circle width={20} height={20} className="mr-2" />
          <Skeleton width={140} height={20} />
        </li>
      ))}
    </ul>
    <Skeleton height={48} borderRadius={8} />
  </div>
);

export default function PricingPlans() {
  const [currentPlan, setCurrentPlan] = useState<SubscriptionTier | 'free'>('free');
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    const checkSubscription = async () => {
      if (!session?.user) {
        setCurrentPlan('free');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/subscription');
        const data = await response.json();

        // Debug logs
        // console.log('Subscription data:', data);
        // console.log('Price ID from env:', process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO);
        // console.log('Price ID from sub:', data.subscription?.priceId);

        if (data.isSubscribed && data.subscription?.priceId) {
          // Check exact string match
          const proPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO;
          const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM;

          if (data.subscription.priceId === proPriceId) {
            console.log('Setting to PRO plan');
            setCurrentPlan(SubscriptionTier.PRO);
          } else if (data.subscription.priceId === premiumPriceId) {
            console.log('Setting to PREMIUM plan');
            setCurrentPlan(SubscriptionTier.PREMIUM);
          } else {
            console.log('Price ID did not match any tier');
            setCurrentPlan('free');
          }
        } else {
          console.log('No subscription or price ID found');
          setCurrentPlan('free');
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setCurrentPlan('free');
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [session]);

  const CurrentPlanBadge = () => (
    <span className="px-3 py-1 text-xs font-semibold text-green-600 bg-green-100 rounded-full">
      CURRENT PLAN
    </span>
  );

  if (loading) {
    return (
      <div className="bg-white backdrop-blur-sm bg-opacity-90 shadow-md rounded-xl p-6 mt-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Pricing Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <PricingPlanSkeleton />
          <PricingPlanSkeleton />
          <PricingPlanSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <div className="bg-white backdrop-blur-sm bg-opacity-90 rounded-xl p-6 mt-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
            Supercharge Your Job Search
          </h2>
          <div className="max-w-2xl mx-auto">
            <p className="text-lg text-gray-700 mb-2">
              Don&apos;t let your dream job slip away. Our AI-powered resume analyzer helps you stand out and
              get more interviews.
            </p>
            <p className="text-gray-600">
              Join thousands of successful job seekers who&apos;ve optimized their resumes with our advanced
              ATS technology.
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">90% Success Rate</span>
              </div>
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">Trusted by 10,000+ Users</span>
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Choose Your Plan</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div className="border rounded-lg p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-semibold text-gray-800">Free Plan</h3>
              {currentPlan === 'free' && <CurrentPlanBadge />}
            </div>{' '}
            <p className="text-3xl font-bold text-blue-600 mb-4">
              $0<span className="text-base font-normal text-gray-600">/month</span>
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-gray-700">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                3 scans per month
              </li>
              <li className="flex items-center text-gray-700">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Basic ATS analysis
              </li>
              <li className="flex items-center text-gray-700">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Content suggestions
              </li>
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-semibold text-gray-800">Pro Plan</h3>
              {currentPlan === SubscriptionTier.PRO ? (
                <CurrentPlanBadge />
              ) : (
                <span className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full">
                  RECOMMENDED
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-blue-600 mb-4">
              $10<span className="text-base font-normal text-gray-600">/month</span>
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-gray-700">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                25 scans per month
              </li>
              <li className="flex items-center text-gray-700">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Advanced ATS optimization
              </li>
              <li className="flex items-center text-gray-700">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Job description matching
              </li>
              <li className="flex items-center text-gray-700">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Detailed feedback
              </li>
              <li className="flex items-center text-gray-700">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Priority support
              </li>
            </ul>
            <SubscribeButton
              tier={SubscriptionTier.PRO}
              disabled={currentPlan === SubscriptionTier.PRO}
              currentPlan={currentPlan}
            />
          </div>
          <div className="border rounded-lg p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-semibold text-gray-800">Premium Plan</h3>
              {currentPlan === SubscriptionTier.PREMIUM ? (
                <CurrentPlanBadge />
              ) : (
                <span className="px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-100 rounded-full">
                  BEST VALUE
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-indigo-600 mb-4">
              $25<span className="text-base font-normal text-gray-600">/month</span>
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-gray-700">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                100 scans per month
              </li>
              <li className="flex items-center text-gray-700">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Advanced ATS optimization
              </li>
              <li className="flex items-center text-gray-700">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Job description matching
              </li>
              <li className="flex items-center text-gray-700">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Detailed feedback
              </li>
              <li className="flex items-center text-gray-700">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Priority support
              </li>
            </ul>
            <SubscribeButton
              tier={SubscriptionTier.PREMIUM}
              disabled={currentPlan === SubscriptionTier.PREMIUM}
              currentPlan={currentPlan}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
