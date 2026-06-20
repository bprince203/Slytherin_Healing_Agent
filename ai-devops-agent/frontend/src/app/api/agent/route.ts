// app/api/agent/route.ts
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const { userId } = auth();
  
  const [tokenResponse] = await clerkClient.users.getUserOauthAccessToken(
    userId!,
    "github"
  );
  
  const githubToken = tokenResponse.token; // Use this with Octokit in LangChain
  // Pass githubToken to your LangChain GitHub tool
}
