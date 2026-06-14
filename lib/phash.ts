export const PHASH_DUPLICATE_THRESHOLD = 6;

export const DHASH_WIDTH = 9;
export const DHASH_HEIGHT = 8;

// Difference hash: for each row, compare each grayscale pixel to its right
// neighbour (DHASH_WIDTH-1 comparisons per row). Bit set when the left pixel
// is brighter. Result is (DHASH_WIDTH-1)*DHASH_HEIGHT = 64 bits, 16 hex chars.
export function dhashFromGrayscale(
  pixels: Uint8Array | number[],
  width: number = DHASH_WIDTH,
  height: number = DHASH_HEIGHT
): string {
  let bits = "";
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width - 1; col++) {
      const left = pixels[row * width + col];
      const right = pixels[row * width + col + 1];
      bits += left > right ? "1" : "0";
    }
  }

  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += Number.parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

export function hamming(a: string, b: string): number {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    let nibble = Number.parseInt(a[i], 16) ^ Number.parseInt(b[i], 16);
    while (nibble) {
      distance += nibble & 1;
      nibble >>= 1;
    }
  }
  return distance;
}

export function isDuplicate(
  a: string,
  b: string,
  threshold: number = PHASH_DUPLICATE_THRESHOLD
): boolean {
  if (!a || !b) return false;
  return hamming(a, b) <= threshold;
}
