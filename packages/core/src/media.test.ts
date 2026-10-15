import { describe, expect, it } from "vitest";

import {
  MEDIA_PATH_PATTERN,
  centredSquare,
  fitWithin,
  hasCameraMetadata,
  mediaPath,
  smallPhotoPath,
} from "./media";

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

describe("hasCameraMetadata", () => {
  const bytes = (...parts: (number[] | string)[]) =>
    new Uint8Array(
      parts.flatMap((part) =>
        typeof part === "string" ? [...part].map((c) => c.charCodeAt(0)) : part,
      ),
    );
  const le = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];

  it("finds EXIF and XMP in a JPEG, and nothing in a clean one", () => {
    const quant = [0xff, 0xdb, 0x00, 0x04, 0x00, 0x00];
    const scan = [0xff, 0xda, 0x00, 0x02];
    expect(hasCameraMetadata(bytes([0xff, 0xd8], quant, scan))).toBe(false);
    const exif = bytes([0xff, 0xd8], [0xff, 0xe1, 0x00, 0x08], "Exif", [0, 0], scan);
    expect(hasCameraMetadata(exif)).toBe(true);
    const xmp = bytes([0xff, 0xd8], [0xff, 0xe1, 0x00, 0x19], "http://ns.adobe.com/xap/1.0/", scan);
    expect(hasCameraMetadata(xmp)).toBe(true);
    // A JFIF header (APP0) is not metadata about the camera.
    const jfif = bytes([0xff, 0xd8], [0xff, 0xe0, 0x00, 0x07], "JFIF", [0], scan);
    expect(hasCameraMetadata(jfif)).toBe(false);
  });

  it("finds EXIF and XMP chunks in a WebP, and the flags that announce them", () => {
    const vp8 = bytes("VP8 ", le(2), [0, 0]);
    const plain = bytes("RIFF", le(0), "WEBP", [...vp8]);
    expect(hasCameraMetadata(plain)).toBe(false);
    expect(hasCameraMetadata(bytes("RIFF", le(0), "WEBP", [...vp8], "EXIF", le(2), [1, 2]))).toBe(
      true,
    );
    expect(hasCameraMetadata(bytes("RIFF", le(0), "WEBP", "XMP ", le(1), [1, 0]))).toBe(true);
    const vp8x = (flags: number) =>
      bytes("RIFF", le(0), "WEBP", "VP8X", le(10), [flags, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(hasCameraMetadata(vp8x(0x00))).toBe(false);
    expect(hasCameraMetadata(vp8x(0x08))).toBe(true);
    expect(hasCameraMetadata(vp8x(0x04))).toBe(true);
  });

  it("treats anything else as carrying metadata", () => {
    expect(hasCameraMetadata(bytes("GIF89a"))).toBe(true);
    expect(hasCameraMetadata(new Uint8Array())).toBe(true);
  });
});
