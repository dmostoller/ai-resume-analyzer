// components/Footer.tsx
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t mt-auto py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-center space-x-6">
          <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-gray-600 hover:text-gray-900">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
