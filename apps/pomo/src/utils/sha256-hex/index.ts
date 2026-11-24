import {uint8ArrayToHex} from 'uint8array-extras'

/** 전달받은 바이트의 SHA-256 해시를 소문자 16진수로 반환한다. */
export const sha256Hex = async (data: BufferSource): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', data)
  return uint8ArrayToHex(new Uint8Array(digest))
}
