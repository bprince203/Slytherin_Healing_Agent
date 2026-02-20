'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

import { AppNavbar } from '@/components/AppNavbar';
import { PublicNavbar } from '@/components/PublicNavbar';

function isOnboardingComplete(user: ReturnType<typeof useUser>['user']): boolean {
  const metadata = user?.unsafeMetadata as { onboardingComplete?: boolean } | undefined;
  return metadata?.onboardingComplete === true;
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();

  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/history') ||
    pathname.startsWith('/run') ||
    pathname.startsWith('/repo') ||
    pathname.startsWith('/onboarding');

  const onAuthPage = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
  const onboardingDone = isOnboardingComplete(user);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn && isProtected) {
      router.replace(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isSignedIn && !onboardingDone && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    if (isSignedIn && onboardingDone && pathname === '/onboarding') {
      router.replace('/dashboard');
    }
  }, [isLoaded, isProtected, isSignedIn, onboardingDone, pathname, router]);

  const showAppNavbar = Boolean(isSignedIn && !onAuthPage);

  return (
    <>
      {showAppNavbar ? <AppNavbar /> : <PublicNavbar />}
      <main className="mx-auto min-h-[calc(100vh-64px)] max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <ShellContent>{children}</ShellContent>;
}
