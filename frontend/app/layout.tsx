import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import '../styles/ora-tokens.css';
import '../styles/ora-typography.css';
import '../styles/ora-utilities.css';

const inter = Inter({ subsets: ['latin'], variable: '--next-font-inter', display: 'swap' });
const serif = Instrument_Serif({ weight: '400', subsets: ['latin'], variable: '--next-font-serif', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--next-font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Ora — MCET LMS',
  description: 'AI-powered Learning Management System for MCET.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ora',
  },
};

export const viewport: Viewport = {
  themeColor: '#D85A30',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: import('react').ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${serif.variable} ${mono.variable}`}
    >
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
