// app/privacy/page.tsx
import { NavHeader } from '@/components/NavHeader';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <NavHeader />
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

        <div className="prose prose-blue max-w-none">
          <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
          <p>We collect information that you provide directly to us, including:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Account information (email, name)</li>
            <li>Resume content for analysis</li>
            <li>Job descriptions you submit</li>
            <li>Usage data and analytics</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
          <p>We use the collected information to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Provide resume analysis services</li>
            <li>Improve our AI algorithms</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send service-related communications</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">3. Data Storage</h2>
          <p>
            Your data is stored securely using industry-standard encryption. We retain your data only as long
            as necessary to provide our services.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">4. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Stripe for payment processing</li>
            <li>Google OAuth for authentication</li>
            <li>OpenAI for analysis</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">5. Contact Us</h2>
          <p>For any privacy-related questions, please contact us at privacy@yourcompany.com</p>
        </div>
      </div>
    </div>
  );
}
