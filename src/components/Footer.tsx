// components/Footer.tsx
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[var(--card-background)] border-t border-[var(--card-border)] mt-auto py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-center space-x-6">
          <Link href="/privacy" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
