import { ConsentClient } from "./consent_client.ts";

export type BuildEvent = { userId: string; category: string; release: string; diagnostic: string };
export type ReleaseDecision = { release: string; status: "released" | "held"; diagnostic: string };

export async function releaseBuild(event: BuildEvent, client: Pick<ConsentClient, "grant">): Promise<ReleaseDecision> {
  if (!event.userId || !event.category || !event.release) throw new Error("userId, category, and release are required");
  try {
    await client.grant(event.userId, event.category);
    return { release: event.release, status: "released", diagnostic: event.diagnostic };
  } catch (error) {
    if (error instanceof Error) return { release: event.release, status: "held", diagnostic: error.message };
    throw error;
  }
}

async function main(): Promise<void> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before starting");
  const userId = process.env.INFRAI_USER_ID;
  if (!userId) throw new Error("Set INFRAI_USER_ID before starting");
  const event: BuildEvent = { userId, category: "third_party", release: "2026.10.25", diagnostic: "consent checked before publish" };
  const decision = await releaseBuild(event, new ConsentClient(key));
  console.log(JSON.stringify(decision));
}

if (process.argv[1]?.endsWith("consent_service.ts")) await main();
