import { NavHeader } from '@/components/NavHeader';

// app/terms/page.tsx
export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <NavHeader />
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

        <div className="prose prose-blue max-w-none">
          <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
          <p>By accessing or using our services, you agree to be bound by these Terms of Service.</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">2. Service Description</h2>
          <p>We provide AI-powered resume analysis and optimization services. The service includes:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Resume analysis</li>
            <li>ATS optimization suggestions</li>
            <li>Job description matching</li>
            <li>Feedback on content and formatting</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">3. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Provide accurate information</li>
            <li>Maintain account security</li>
            <li>Not misuse the service</li>
            <li>Comply with all applicable laws</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">4. Subscription and Payments</h2>
          <p>Subscription terms:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Monthly billing cycle</li>
            <li>Automatic renewal</li>
            <li>Cancel anytime</li>
            <li>No refunds for partial months</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">5. Limitation of Liability</h2>
          <p>We provide the service &quot;as is&quot; without warranties. We are not liable for:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Service interruptions</li>
            <li>Data loss</li>
            <li>Job application outcomes</li>
            <li>Third-party services</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">6. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the service constitutes
            acceptance of new terms.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">7. Contact</h2>
          <p>For any questions about these terms, please contact us at dmostoller@gmail.com</p>
        </div>
      </div>
    </div>
  );
}
