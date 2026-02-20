'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [team, setTeam] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    try {
      setSubmitting(true);
      const [firstName, ...rest] = fullName.trim().split(' ');

      await user.update({
        firstName: firstName || user.firstName || undefined,
        lastName: rest.length > 0 ? rest.join(' ') : user.lastName || undefined,
        unsafeMetadata: {
          ...user.unsafeMetadata,
          onboardingComplete: true,
          profile: {
            role,
            team,
          },
        },
      });

      toast.success('Profile setup complete');
      router.push('/dashboard');
    } catch {
      toast.error('Could not save onboarding profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded) {
    return <div className="text-sm text-muted">Loading profile...</div>;
  }

  return (
    <div className="mx-auto max-w-xl rounded-xl2 border border-border bg-card p-6 shadow-soft">
      <h1 className="text-2xl font-semibold text-foreground">Complete your onboarding</h1>
      <p className="mt-2 text-sm text-muted">
        Add your profile details now. These will be used by backend profile APIs when we implement backend integration.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm text-foreground">Full name</label>
          <input
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-info/60"
            placeholder="Jane Devops"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-foreground">Role</label>
          <input
            required
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-info/60"
            placeholder="Platform Engineer"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-foreground">Team / Organization</label>
          <input
            required
            value={team}
            onChange={(event) => setTeam(event.target.value)}
            className="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-info/60"
            placeholder="Infra Squad"
          />
        </div>

        <button
          disabled={submitting}
          className="rounded-lg bg-info px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Finish onboarding'}
        </button>
      </form>
    </div>
  );
}
