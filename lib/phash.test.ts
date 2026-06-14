// @ts-expect-error - bun:test is built-in to the Bun runtime, not typed here
import { test, expect } from "bun:test";
import { dhashFromGrayscale, hamming, isDuplicate, DHASH_WIDTH, DHASH_HEIGHT } from "./phash";

function gridFrom(rows: number[][]): Uint8Array {
  return Uint8Array.from(rows.flat());
}

test("dhash produces a 16-char hex string (64 bits)", () => {
  const pixels = new Uint8Array(DHASH_WIDTH * DHASH_HEIGHT).fill(0);
  expect(dhashFromGrayscale(pixels)).toHaveLength(16);
});

test("uniform image has all-zero hash (no left>right anywhere)", () => {
  const pixels = new Uint8Array(DHASH_WIDTH * DHASH_HEIGHT).fill(128);
  expect(dhashFromGrayscale(pixels)).toBe("0000000000000000");
});

test("strictly increasing rows (left<right) -> all zero bits", () => {
  const rows = Array.from({ length: DHASH_HEIGHT }, () =>
    Array.from({ length: DHASH_WIDTH }, (_, c) => c * 10)
  );
  expect(dhashFromGrayscale(gridFrom(rows))).toBe("0000000000000000");
});

test("strictly decreasing rows (left>right) -> all one bits", () => {
  const rows = Array.from({ length: DHASH_HEIGHT }, () =>
    Array.from({ length: DHASH_WIDTH }, (_, c) => (DHASH_WIDTH - c) * 10)
  );
  expect(dhashFromGrayscale(gridFrom(rows))).toBe("ffffffffffffffff");
});

test("hamming distance: identical = 0, opposite = 64", () => {
  expect(hamming("ffffffffffffffff", "ffffffffffffffff")).toBe(0);
  expect(hamming("ffffffffffffffff", "0000000000000000")).toBe(64);
  expect(hamming("0000000000000000", "0000000000000001")).toBe(1);
});

test("hamming on mismatched lengths is treated as maximally distant", () => {
  expect(hamming("ff", "ffff")).toBe(Number.MAX_SAFE_INTEGER);
});

test("isDuplicate respects the threshold and rejects empty hashes", () => {
  expect(isDuplicate("0000000000000000", "0000000000000003", 6)).toBe(true); // distance 2
  expect(isDuplicate("0000000000000000", "00000000000000ff", 6)).toBe(false); // distance 8
  expect(isDuplicate("", "0000000000000000")).toBe(false);
});

test("a small perturbation stays within the duplicate threshold", () => {
  const base: number[][] = Array.from({ length: DHASH_HEIGHT }, (_, r) =>
    Array.from({ length: DHASH_WIDTH }, (_, c) => ((c + r) % 2 === 0 ? 200 : 50))
  );
  const a = dhashFromGrayscale(gridFrom(base));
  // Flip one pixel slightly — should change at most a couple of bits.
  const perturbed = base.map((row) => [...row]);
  perturbed[0][0] = 60;
  const b = dhashFromGrayscale(gridFrom(perturbed));
  expect(hamming(a, b)).toBeLessThanOrEqual(6);
});
