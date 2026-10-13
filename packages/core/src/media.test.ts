import { describe, expect, it } from "vitest";

import { MEDIA_PATH_PATTERN, centredSquare, fitWithin, mediaPath, smallPhotoPath } from "./media";

const USER = "0b0e7c1e-6f0a-4a57-9b3c-2f1d9a8e7c11";
const FILE = "9c0e7c1e-6f0a-4a57-9b3c-2f1d9a8e7c33";

describe("fitWithin", () => {
  it("shrinks the longest edge to the limit and keeps the proportions", () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(4000, 4000, 480)).toEqual({ width: 480, height: 480 });
  });

  it("never enlarges, and never rounds an edge away", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(6000, 2, 480)).toEqual({ width: 480, height: 1 });
  });
});

describe("centredSquare", () => {
  it("takes the middle of a wide or a tall picture", () => {
    expect(centredSquare(4000, 3000)).toEqual({ x: 500, y: 0, size: 3000 });
    expect(centredSquare(3000, 4000)).toEqual({ x: 0, y: 500, size: 3000 });
  });
});

describe("paths", () => {
  it("are built the way the database expects them", () => {
    const path = mediaPath("tastings", USER, FILE, "webp");
    expect(path).toBe(`tastings/${USER}/${FILE}.webp`);
    expect(MEDIA_PATH_PATTERN.test(path)).toBe(true);
    expect(MEDIA_PATH_PATTERN.test(mediaPath("avatars", USER, FILE, "jpg"))).toBe(true);
    expect(MEDIA_PATH_PATTERN.test(`tastings/${USER}/../${FILE}.webp`)).toBe(false);
    expect(MEDIA_PATH_PATTERN.test(`tastings/${USER}/${FILE}.png`)).toBe(false);
  });

  it("name the small twin beside the full picture", () => {
    expect(smallPhotoPath(`tastings/${USER}/${FILE}.webp`)).toBe(`tastings/${USER}/${FILE}-s.webp`);
    expect(smallPhotoPath(`tastings/${USER}/${FILE}.jpg`)).toBe(`tastings/${USER}/${FILE}-s.jpg`);
  });
});
