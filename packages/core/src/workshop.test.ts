import { describe, expect, it } from "vitest";

import { isWorkshopContact } from "./workshop";

describe("isWorkshopContact", () => {
  it("takes a phone number or an Instagram handle", () => {
    expect(isWorkshopContact("0555 123 45 67")).toBe(true);
    expect(isWorkshopContact("+90 (555) 123-45-67")).toBe(true);
    expect(isWorkshopContact("@kahve.sever_34")).toBe(true);
    expect(isWorkshopContact("kahvesever")).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isWorkshopContact("12 34")).toBe(false);
    expect(isWorkshopContact("ada@example.com")).toBe(false);
    expect(isWorkshopContact("bir iki üç")).toBe(false);
    expect(isWorkshopContact("")).toBe(false);
  });
});
