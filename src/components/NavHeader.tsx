// components/NavHeader.tsx
import Link from 'next/link';

export function NavHeader() {
  return (
    <header className="py-4 px-6 mb-8">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Back to Home</span>
        </Link>
      </div>
    </header>
  );
}
