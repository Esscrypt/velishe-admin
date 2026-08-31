// @ts-expect-error bun:test
import { describe, expect, it } from "bun:test";
import {
  hasDisplayableCredits,
  normalizeBlogCredits,
} from "./blog-credits";

describe("normalizeBlogCredits", () => {
  it("returns null for empty / null input", () => {
    expect(normalizeBlogCredits(null)).toBeNull();
    expect(normalizeBlogCredits({})).toBeNull();
  });

  it("keeps https urls and drops http", () => {
    const result = normalizeBlogCredits({
      brand: { name: "Tuborg", url: "https://www.tuborg.com/" },
      photographer: { name: "X", url: "http://evil.example/" },
    });
    expect(result?.brand?.url).toBe("https://www.tuborg.com/");
    expect(result?.photographer?.url).toBeNull();
  });

  it("caps extras at 12", () => {
    const extras = Array.from({ length: 15 }, (_, i) => ({
      role: `R${i}`,
      name: `N${i}`,
    }));
    expect(normalizeBlogCredits({ extras })?.extras).toHaveLength(12);
  });
});

describe("hasDisplayableCredits", () => {
  it("is true when talent only", () => {
    expect(hasDisplayableCredits(null, true)).toBe(true);
  });
});
