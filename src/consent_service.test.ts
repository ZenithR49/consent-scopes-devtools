import assert from "node:assert/strict";
import { test } from "node:test";
import { releaseBuild, type BuildEvent } from "./consent_service.ts";

test("a rejected consent grant holds the release and keeps the diagnostic", async () => {
  const event: BuildEvent = { userId: "developer-42", category: "third_party", release: "2026.10.25", diagnostic: "consent checked before publish" };
  const client = { grant: async () => { throw new Error("consent rejected"); } };
  assert.deepEqual(await releaseBuild(event, client), { release: "2026.10.25", status: "held", diagnostic: "consent rejected" });
});
