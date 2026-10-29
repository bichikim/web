import {withAbort} from '../internal/with-abort'

/** SHA-256 of stored section bytes; the algorithm is part of Poffo v1. */
export const digest = async (
  source: Blob,
  signal?: AbortSignal,
): Promise<Uint8Array<ArrayBuffer>> => {
  const bytes = await withAbort(() => source.arrayBuffer(), signal)
  const hash = await withAbort(() => crypto.subtle.digest('SHA-256', bytes), signal)
  return new Uint8Array(hash)
}

export const digestHex = (bytes: Uint8Array): string => {
  const HEX_RADIX = 16
  return Array.from(bytes, (value) => value.toString(HEX_RADIX).padStart(2, '0')).join('')
}
