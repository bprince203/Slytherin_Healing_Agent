'use client';

import Link from 'next/link';
import { Bot, LayoutDashboard } from 'lucide-react';
import { SignOutButton, UserButton } from '@clerk/nextjs';

export function AppNavbar() {
  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bot className="h-5 w-5 text-info" />
          AI DevOps Copilot
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted transition hover:bg-white/5 hover:text-foreground sm:px-3 sm:text-sm"
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            );
          })}
          <SignOutButton>
            <button className="rounded-lg border border-border px-2 py-1 text-xs text-foreground hover:bg-white/5 sm:px-3 sm:text-sm">
              Logout
            </button>
          </SignOutButton>
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>
    </header>
  );
}
