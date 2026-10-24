// oxlint-disable no-magic-numbers, no-bitwise -- CRC32 uses fixed byte and bit constants.
const checksumTable = Uint32Array.from({length: 256}, (_, value) => {
  let checksum = value
  for (let bit = 0; bit < 8; bit += 1) {
    checksum = checksum & 1 ? 0xedb88320 ^ (checksum >>> 1) : checksum >>> 1
  }
  return checksum >>> 0
})

export const updateChecksum = (checksum: number, bytes: Uint8Array): number => {
  let current = checksum
  for (const byte of bytes) {
    current = checksumTable[(current ^ byte) & 0xff] ^ (current >>> 8)
  }
  return current >>> 0
}
