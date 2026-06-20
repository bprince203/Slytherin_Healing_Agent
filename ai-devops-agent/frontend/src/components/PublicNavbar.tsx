'use client';

import Link from 'next/link';
import { Bot } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

const links = [
  { href: '/', label: 'Home' },
  { href: '/#workflow', label: 'Workflow' },
  { href: '/#features', label: 'Fixes' },
  { href: '/#stats', label: 'Stats' },
];

export function PublicNavbar() {
  const { isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bot className="h-5 w-5 text-info" />
          AutoHeal AI
        </Link>
        <div className="hidden items-center gap-5 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-slate-300 hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <Link href="/dashboard" className="rounded-lg bg-info px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="px-3 py-2 text-sm font-medium text-foreground hover:text-info">
                Login
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-info px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
