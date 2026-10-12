import { describe, expect, it } from "vitest";

import { commentRowSchema, parseCommentBody, threadComments } from "./comment";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function row(n: number, fields: Record<string, unknown> = {}) {
  return commentRowSchema.parse({
    id: id(n),
    tasting_id: id(900),
    user_id: id(100 + n),
    parent_id: null,
    body: `yorum ${n}`,
    created_at: `2026-10-12T10:0${n}:00+00:00`,
    edited_at: null,
    deleted_at: null,
    hidden_at: null,
    author: { username: `uye_${n}`, display_name: null },
    ...fields,
  });
}

describe("comment rows", () => {
  it("carry the author's public name", () => {
    expect(row(1)).toMatchObject({
      body: "yorum 1",
      edited: false,
      deleted: false,
      hidden: false,
      author: { id: id(101), username: "uye_1", displayName: null },
    });
  });

  it("have neither words nor author once removed", () => {
    const removed = row(2, {
      user_id: null,
      body: null,
      deleted_at: "2026-10-12T11:00:00+00:00",
      author: null,
    });
    expect(removed).toMatchObject({ body: null, deleted: true, author: null });
  });
});

describe("threadComments", () => {
  it("hangs replies under their comment and keeps the order given", () => {
    const threads = threadComments([
      row(1),
      row(2),
      row(3, { parent_id: id(1) }),
      row(4, { parent_id: id(1) }),
    ]);
    expect(threads.map((thread) => thread.id)).toEqual([id(1), id(2)]);
    expect(threads[0]!.replies.map((reply) => reply.id)).toEqual([id(3), id(4)]);
    expect(threads[1]!.replies).toEqual([]);
  });

  it("keeps a removed comment only while it still has replies", () => {
    const removed = {
      user_id: null,
      body: null,
      deleted_at: "2026-10-12T11:00:00+00:00",
      author: null,
    };
    const threads = threadComments([
      row(1, removed),
      row(2, removed),
      row(3, { parent_id: id(1) }),
    ]);
    expect(threads.map((thread) => thread.id)).toEqual([id(1)]);
  });
});

describe("parseCommentBody", () => {
  it("trims and normalises line breaks", () => {
    expect(parseCommentBody("  merhaba\r\ndünya  ")).toEqual({ ok: true, body: "merhaba\ndünya" });
  });

  it("refuses nothing and too much", () => {
    expect(parseCommentBody("   ")).toEqual({ ok: false, error: "empty" });
    expect(parseCommentBody("x".repeat(2001))).toEqual({ ok: false, error: "tooLong" });
    expect(parseCommentBody("x".repeat(2000)).ok).toBe(true);
  });
});
