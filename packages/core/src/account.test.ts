import { describe, expect, it } from "vitest";

import {
  RESERVED_USERNAMES,
  isPlaceholderUsername,
  normalizeUsername,
  usernameProblem,
} from "./account";

describe("usernames", () => {
  it("are stored trimmed and in lower case", () => {
    expect(normalizeUsername("  Ada_Lovelace ")).toBe("ada_lovelace");
  });

  it("accept 3 to 24 lower-case letters, digits and underscores", () => {
    for (const name of ["ada", "ada_lovelace", "v60_sever", "a".repeat(24)]) {
      expect(usernameProblem(name)).toBeNull();
    }
    for (const name of ["ab", "a".repeat(25), "Ada", "ada lovelace", "ada-l", "çay", "ada.l", ""]) {
      expect(usernameProblem(name)).toBe("invalid");
    }
  });

  it("refuse names that belong to the site", () => {
    for (const name of ["admin", "espressoir", "kahve", "panel", "giris"]) {
      expect(usernameProblem(name)).toBe("reserved");
    }
    // Close, but not on the list.
    expect(usernameProblem("admin_ada")).toBeNull();
  });

  it("keep the reserved list sorted and free of duplicates", () => {
    expect([...RESERVED_USERNAMES]).toEqual([...new Set(RESERVED_USERNAMES)].sort());
  });

  it("recognise the placeholder given at signup", () => {
    expect(isPlaceholderUsername("u_0123456789abcdef")).toBe(true);
    expect(isPlaceholderUsername("u_ada")).toBe(false);
    expect(isPlaceholderUsername("ada")).toBe(false);
  });
});
