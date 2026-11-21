import { MAX_FONT_SIZE, MIN_FONT_SIZE, normalizeFontSize } from "@/features/settings/fontSize";

describe("reader font sizes", () => {
  it("supports every integer from 12 to 40", () => {
    expect(MIN_FONT_SIZE).toBe(12);
    expect(MAX_FONT_SIZE).toBe(40);
    for (let size = 12; size <= 40; size += 1) {
      expect(normalizeFontSize(size)).toBe(size);
    }
  });

  it("keeps out-of-range and fractional input within the supported integer range", () => {
    expect(normalizeFontSize(0)).toBe(12);
    expect(normalizeFontSize(-10)).toBe(12);
    expect(normalizeFontSize(99)).toBe(40);
    expect(normalizeFontSize(18.7)).toBe(19);
  });

  it("restores the current size for missing or invalid numeric input", () => {
    expect(normalizeFontSize(Number.NaN, 21)).toBe(21);
    expect(normalizeFontSize(Number.POSITIVE_INFINITY, 24)).toBe(24);
    expect(normalizeFontSize(Number.NaN)).toBe(18);
  });
});
