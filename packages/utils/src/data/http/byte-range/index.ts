import type {ByteRange} from './types'

const BYTE_RANGE_PATTERN = /^bytes=(?<start>\d*)-(?<end>\d*)$/u

/**
 * Resolves one byte range against a non-negative representation length.
 * Returns null for malformed or unsatisfiable ranges. A suffix of an empty
 * representation retains the empty span {start: 0, end: -1}.
 */
export const parseByteRange = (value: string, contentLength: number): ByteRange | null => {
  const match = BYTE_RANGE_PATTERN.exec(value)
  const startText = match?.groups?.start
  const endText = match?.groups?.end

  if (startText === undefined || endText === undefined || (startText === '' && endText === '')) {
    return null
  }

  if (startText === '') {
    const suffixLength = Number(endText)

    return Number.isSafeInteger(suffixLength) && suffixLength > 0
      ? {end: contentLength - 1, start: Math.max(0, contentLength - suffixLength)}
      : null
  }

  const start = Number(startText)
  const requestedEnd = endText === '' ? contentLength - 1 : Number(endText)
  const end = Math.min(requestedEnd, contentLength - 1)

  return Number.isSafeInteger(start) &&
    Number.isSafeInteger(requestedEnd) &&
    start >= 0 &&
    start <= end &&
    start < contentLength
    ? {end, start}
    : null
}

export * from './types'
