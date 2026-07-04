import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Company Research Assistant',
  description:
    'AI-powered Company Research Assistant — crawls company websites, researches via Serper.dev, analyzes with AI, finds competitors, and generates downloadable PDF reports.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface-950 text-gray-100 antialiased">{children}</body>
    </html>
  );
}
