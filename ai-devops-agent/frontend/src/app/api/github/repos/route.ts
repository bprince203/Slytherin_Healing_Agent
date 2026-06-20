// app/api/github/repos/route.ts
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = await clerkClient();
    const tokenResponse = await client.users.getUserOauthAccessToken(
      userId,
      'oauth_github'
    );

    if (!tokenResponse.data?.[0]?.token) {
      return NextResponse.json({ repos: [] });
    }

    const githubRes = await fetch(
      'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator',
      {
        headers: {
          Authorization: `Bearer ${tokenResponse.data[0].token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!githubRes.ok) {
      return NextResponse.json({ repos: [] });
    }

    const repos = await githubRes.json();
    // Return only what the UI needs
    const simplified = repos.map((r: { full_name: string; html_url: string; private: boolean; updated_at: string }) => ({
      full_name: r.full_name,           // "owner/repo"
      html_url: r.html_url,             // "https://github.com/owner/repo"
      private: r.private,
      updated_at: r.updated_at,
    }));

    return NextResponse.json({ repos: simplified });
  } catch {
    return NextResponse.json({ repos: [] });
  }
}
