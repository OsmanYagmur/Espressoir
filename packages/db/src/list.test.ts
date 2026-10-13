import { describe, expect, it } from "vitest";

import { listInputSchema, listNoteSchema, listRowSchema } from "./list";

const errors = (input: unknown) => {
  const result = listInputSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("listInputSchema", () => {
  it("tidies the title and turns an empty description into none", () => {
    expect(
      listInputSchema.parse({
        title: "  En sevdiğim   espressolar ",
        description: " ",
        isPublic: true,
      }),
    ).toEqual({ title: "En sevdiğim espressolar", description: null, isPublic: true });
  });

  it("needs a title and keeps both texts within their limits", () => {
    expect(errors({ title: "   ", description: "", isPublic: true })).toEqual(["titleRequired"]);
    expect(errors({ title: "a".repeat(81), description: "", isPublic: false })).toEqual([
      "titleTooLong",
    ]);
    expect(errors({ title: "Liste", description: "a".repeat(501), isPublic: false })).toEqual([
      "descriptionTooLong",
    ]);
  });
});

describe("listNoteSchema", () => {
  it("trims, treats empty as none and limits the length", () => {
    expect(listNoteSchema.parse("  Sütle harika.  ")).toBe("Sütle harika.");
    expect(listNoteSchema.parse("   ")).toBeNull();
    expect(listNoteSchema.safeParse("a".repeat(281)).success).toBe(false);
  });
});

describe("listRowSchema", () => {
  it("reshapes a row of the list_feed view", () => {
    const list = listRowSchema.parse({
      list_id: "0b0e7c1e-6f0a-4a57-9b3c-2f1d9a8e7c11",
      slug: "en-sevdigim-espressolar",
      title: "En sevdiğim espressolar",
      description: null,
      is_public: true,
      is_hidden: false,
      created_at: "2026-10-14T09:00:00+00:00",
      updated_at: "2026-10-14T09:05:00+00:00",
      user_id: "5a0e7c1e-6f0a-4a57-9b3c-2f1d9a8e7c22",
      username: "ada",
      display_name: null,
      items: [{ coffee_id: "9c0e7c1e-6f0a-4a57-9b3c-2f1d9a8e7c33", note: "Sütle harika." }],
    });
    expect(list).toMatchObject({
      id: "0b0e7c1e-6f0a-4a57-9b3c-2f1d9a8e7c11",
      owner: { username: "ada" },
      items: [{ coffeeId: "9c0e7c1e-6f0a-4a57-9b3c-2f1d9a8e7c33", note: "Sütle harika." }],
    });
  });
});
