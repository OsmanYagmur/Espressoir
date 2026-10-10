import { afterEach, describe, expect, it } from "vitest";
import { assertTarget, parseTargetEnv, projectRefFromDbUrl } from "./target-env";

describe("parseTargetEnv", () => {
  it("defaults to dev and accepts prod", () => {
    expect(parseTargetEnv([])).toBe("dev");
    expect(parseTargetEnv(["--env", "prod"])).toBe("prod");
  });

  it("rejects anything else", () => {
    expect(() => parseTargetEnv(["--env", "production"])).toThrow();
  });
});

describe("projectRefFromDbUrl", () => {
  it("reads the ref from pooler and direct URLs", () => {
    expect(
      projectRefFromDbUrl(
        "postgresql://postgres.abcdefghij:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
      ),
    ).toBe("abcdefghij");
    expect(
      projectRefFromDbUrl("postgresql://postgres:secret@db.klmnopqrst.supabase.co:5432/postgres"),
    ).toBe("klmnopqrst");
    expect(projectRefFromDbUrl("postgresql://postgres@localhost:54322/postgres")).toBeNull();
  });
});

describe("assertTarget", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("blocks dev commands that point at prod", async () => {
    process.env.SUPABASE_DEV_PROJECT_REF = "devref";
    process.env.SUPABASE_PROD_PROJECT_REF = "prodref";
    await expect(
      assertTarget(
        "dev",
        "postgresql://postgres.prodref:x@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
      ),
    ).rejects.toThrow();
    await expect(
      assertTarget(
        "dev",
        "postgresql://postgres.devref:x@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
      ),
    ).resolves.toBeUndefined();
  });

  it("blocks prod commands whose URL is not the prod project", async () => {
    process.env.SUPABASE_PROD_PROJECT_REF = "prodref";
    await expect(
      assertTarget(
        "prod",
        "postgresql://postgres.devref:x@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
      ),
    ).rejects.toThrow();
  });
});
