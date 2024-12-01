import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from './lib/providers';
import { Footer } from '@/components/Footer';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900'
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900'
});

export const metadata: Metadata = {
  title: 'AI Resume Analyzer | Optimize Your Resume with AI',
  description:
    'Free AI-powered resume analysis tool that provides personalized feedback and matches your resume against job descriptions. Get instant insights to improve your job applications.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-[var(--foreground)]`}
      >
        <Providers>{children}</Providers>
        <div id="portal-root" />
        <Footer />
      </body>
    </html>
  );
}
