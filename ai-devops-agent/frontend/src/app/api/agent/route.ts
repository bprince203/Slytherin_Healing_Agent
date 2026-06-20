// app/api/agent/route.ts
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
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

    const githubToken = tokenResponse.data?.[0]?.token ?? null;

    return NextResponse.json({ githubToken });
  } catch {
    return NextResponse.json({ githubToken: null }, { status: 500 });
  }
}
