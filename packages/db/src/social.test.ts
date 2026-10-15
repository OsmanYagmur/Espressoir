import { describe, expect, it } from "vitest";

import type { TypedSupabaseClient } from "./index";
import {
  SocialFailure,
  feedCursorOf,
  loadFeedPage,
  setFollowing,
  setLiked,
  setListItem,
  socialErrorKind,
} from "./social";

type Answer = { data?: unknown; error: { code?: string; message: string } | null };

/**
 * A stand-in for supabase-js: every builder method records itself and returns the chain,
 * which answers `answer` when awaited. Enough to check what a helper asks for and how it
 * treats the database's reply, without a database.
 */
function fakeClient(answer: Answer) {
  const calls: [string, unknown[]][] = [];
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "insert", "delete", "update", "eq", "or", "order", "limit"]) {
    chain[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return chain;
    };
  }
  chain.then = (resolve: (value: Answer) => unknown) =>
    resolve({ data: answer.data ?? [], error: answer.error });
  const client = {
    from: (table: string) => {
      calls.push(["from", [table]]);
      return chain;
    },
  } as unknown as TypedSupabaseClient;
  return { client, calls };
}

describe("database refusals", () => {
  it("are reduced to what a person can do about them", () => {
    expect(socialErrorKind({ message: 'rate_limited: "likes"' })).toBe("rateLimited");
    expect(socialErrorKind({ message: "comment_parent must be a top-level comment" })).toBe(
      "parentGone",
    );
    expect(socialErrorKind({ message: "too_many_lists" })).toBe("tooManyLists");
    expect(socialErrorKind({ message: "list_full" })).toBe("listFull");
    expect(socialErrorKind({ code: "23505", message: "duplicate key" })).toBe("duplicate");
    expect(socialErrorKind({ code: "42501", message: "permission denied" })).toBe("restricted");
    expect(
      socialErrorKind({ message: 'new row violates row-level security policy for "likes"' }),
    ).toBe("restricted");
    expect(socialErrorKind({ message: "something else" })).toBe("failed");
  });
});

describe("asking twice for the same thing", () => {
  const duplicate = { error: { code: "23505", message: "duplicate key value" } };

  it("is not an error for a like, a follow or a list entry", async () => {
    await expect(setLiked(fakeClient(duplicate).client, "t", "u", true)).resolves.toBeUndefined();
    await expect(
      setFollowing(fakeClient(duplicate).client, "u", "v", true),
    ).resolves.toBeUndefined();
    await expect(
      setListItem(fakeClient(duplicate).client, "l", "c", true),
    ).resolves.toBeUndefined();
  });

  it("other refusals come back as a SocialFailure with their kind", async () => {
    const refused = fakeClient({ error: { code: "42501", message: "permission denied" } });
    const failure = await setLiked(refused.client, "t", "u", true).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(SocialFailure);
    expect((failure as SocialFailure).kind).toBe("restricted");
  });
});

describe("feed pages", () => {
  it("start from the newest public entries", async () => {
    const { client, calls } = fakeClient({ error: null });
    await loadFeedPage(client, "tasting_feed", null, 10);
    expect(calls).toContainEqual(["from", ["tasting_feed"]]);
    expect(calls).toContainEqual(["eq", ["status", "logged"]]);
    expect(calls).toContainEqual(["eq", ["visibility", "public"]]);
    expect(calls).toContainEqual(["limit", [10]]);
    expect(calls.some(([method]) => method === "or")).toBe(false);
  });

  it("continue after the last entry, rows sharing its timestamp included", async () => {
    const { client, calls } = fakeClient({ error: null });
    await loadFeedPage(
      client,
      "following_feed",
      { createdAt: "2026-10-15T10:00:00Z", id: "x" },
      10,
    );
    // Row level security decides what a followed member's entries show; no visibility filter.
    expect(calls).not.toContainEqual(["eq", ["visibility", "public"]]);
    expect(calls).toContainEqual([
      "or",
      [
        'created_at.lt."2026-10-15T10:00:00Z",and(created_at.eq."2026-10-15T10:00:00Z",tasting_id.lt.x)',
      ],
    ]);
  });

  it("have no cursor before the first page", () => {
    expect(feedCursorOf(undefined)).toBeNull();
  });
});
