/** Returns the lowercase hexadecimal SHA-256 digest of the supplied bytes. */
export const sha256Hex = async (data: BufferSource): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', data)
  const radix = 16
  return Array.from(new Uint8Array(digest), (value) => value.toString(radix).padStart(2, '0')).join(
    '',
  )
}
