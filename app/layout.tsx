import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'bajetAI - Enhancing Public Participation',
    template: '%s | bajetAI',
  },
  description: 'An Agentic AI-Powered Platform for Enhancing Public Participation in Public Matters',
  keywords: ['citizen participation', 'public engagement', 'government transparency', 'Kenya', 'budget participation', 'civic tech', 'public consultation', 'AI-powered platform', 'e-governance', 'public participation platform'],
  authors: [{ name: 'iLabAfrica' }],
  creator: 'bajetAI',
  publisher: 'iLabAfrica',
  metadataBase: new URL('https://bajetai.vercel.app'), // Update with your actual domain
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://bajetai.vercel.app',
    siteName: 'bajetAI',
    title: 'bajetAI - Enhancing Public Participation',
    description: 'An Agentic AI-Powered Platform for Enhancing Public Participation in Public Matters',
    images: [
      {
        url: '/og-image.png', // Add this image later
        width: 1200,
        height: 630,
        alt: 'bajetAI - Enhancing Public Participation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bajetAI - Enhancing Public Participation',
    description: 'An Agentic AI-Powered Platform for Enhancing Public Participation in Public Matters',
    images: ['/og-image.png'],
    creator: '@bajetAI', // Update with actual Twitter handle
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
