import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

import { Navbar } from '@/components/Navbar';

import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI DevOps Copilot',
  description: 'Frontend-only dashboard for AI-driven DevOps pipeline automation',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Navbar />
        <main className="mx-auto min-h-[calc(100vh-64px)] max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
