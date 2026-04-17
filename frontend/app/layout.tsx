import type { Metadata, Viewport } from 'next';
import './globals.css';

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
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
