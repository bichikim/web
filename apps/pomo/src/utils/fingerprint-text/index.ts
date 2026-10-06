const PRIMARY_BASE = 31
const PRIMARY_MODULUS = 2_147_483_647
const RADIX = 36
const SECONDARY_BASE = 37
const SECONDARY_MODULUS = 2_147_483_629

/**
 * Returns a noncryptographic fingerprint of unnormalized Unicode code points; collisions are possible.
 * Uses base31/modulus2147483647 and base37/modulus2147483629, joined as base36 hashes; empty yields 0-0.
 */
export const fingerprintText = (text: string): string => {
  let primaryHash = 0
  let secondaryHash = 0

  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0
    primaryHash = (primaryHash * PRIMARY_BASE + codePoint) % PRIMARY_MODULUS
    secondaryHash = (secondaryHash * SECONDARY_BASE + codePoint) % SECONDARY_MODULUS
  }

  return `${primaryHash.toString(RADIX)}-${secondaryHash.toString(RADIX)}`
}
