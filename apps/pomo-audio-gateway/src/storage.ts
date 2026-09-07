const EDGE_CACHE_SECONDS = 31_536_000
const BROWSER_CACHE_SECONDS = 3600
const HTTP_PARTIAL_CONTENT = 206
const HTTP_RANGE_NOT_SATISFIABLE = 416
const STORAGE_PREFIX_SEGMENT_PATTERN = /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/u
const SINGLE_BYTE_RANGE_PATTERN = /^bytes=(?<first>\d*)-(?<last>\d*)$/u

export const isSingleByteRange = (rangeHeader: string): boolean =>
  SINGLE_BYTE_RANGE_PATTERN.test(rangeHeader)

const normalizeObjectKeyPrefix = (value: string): string => {
  const trimmedValue = value.trim()
  let startIndex = 0

  while (trimmedValue[startIndex] === '/') {
    startIndex += 1
  }

  let endIndex = trimmedValue.length

  while (endIndex > startIndex && trimmedValue[endIndex - 1] === '/') {
    endIndex -= 1
  }

  return trimmedValue.slice(startIndex, endIndex)
}

export const createStorageObjectKey = (objectKey: string, prefix: string): string => {
  const normalizedPrefix = normalizeObjectKeyPrefix(prefix)

  if (normalizedPrefix.length === 0) {
    return objectKey
  }

  if (
    normalizedPrefix.split('/').some((segment) => !STORAGE_PREFIX_SEGMENT_PATTERN.test(segment))
  ) {
    throw new TypeError('R2_OBJECT_PREFIX is invalid')
  }

  return `${normalizedPrefix}/${objectKey}`
}

const createAudioHeaders = (object: R2Object): Headers => {
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Content-Type', 'audio/mpeg')
  headers.set('ETag', object.httpEtag)
  return headers
}

const createObjectHeaders = (object: R2Object, assetId: string): Headers => {
  const headers = createAudioHeaders(object)
  headers.set('Cache-Control', `public, s-maxage=${EDGE_CACHE_SECONDS}, immutable`)
  headers.set('Cache-Tag', `paid-audio-${assetId}`)
  headers.set('X-Content-Type-Options', 'nosniff')
  return headers
}

export const createObjectResponse = (object: R2ObjectBody, assetId: string): Response => {
  const headers = createObjectHeaders(object, assetId)
  headers.set('Content-Length', object.size.toString())
  return new Response(object.body, {headers})
}

export const createHeadObjectResponse = (object: R2Object): Response => {
  const headers = createAudioHeaders(object)
  headers.set('Cache-Control', `private, max-age=${BROWSER_CACHE_SECONDS}`)
  headers.set('Content-Length', object.size.toString())
  return new Response(null, {headers})
}

const createRangeNotSatisfiableResponse = async (
  object: R2ObjectBody,
  assetId: string,
): Promise<Response> => {
  await object.body.cancel().catch(() => undefined)
  const headers = createObjectHeaders(object, assetId)
  headers.set('Content-Range', `bytes */${object.size}`)
  return new Response(null, {headers, status: HTTP_RANGE_NOT_SATISFIABLE})
}

const isRequestedRangeUnsatisfiable = (rangeHeader: string, objectSize: number): boolean => {
  const match = SINGLE_BYTE_RANGE_PATTERN.exec(rangeHeader)

  if (match === null) {
    return false
  }

  const firstValue = match.groups?.first ?? ''
  const lastValue = match.groups?.last ?? ''

  if (firstValue.length === 0) {
    const suffixLength = Number(lastValue)
    return !Number.isSafeInteger(suffixLength) || suffixLength === 0
  }

  const firstPosition = Number(firstValue)

  if (!Number.isSafeInteger(firstPosition) || firstPosition >= objectSize) {
    return true
  }

  if (lastValue.length === 0) {
    return false
  }

  const lastPosition = Number(lastValue)
  return !Number.isSafeInteger(lastPosition) || lastPosition < firstPosition
}

export const createRangedObjectResponse = async (
  object: R2ObjectBody,
  assetId: string,
  rangeHeader: string,
): Promise<Response> => {
  if (isRequestedRangeUnsatisfiable(rangeHeader, object.size)) {
    return createRangeNotSatisfiableResponse(object, assetId)
  }

  const {range} = object

  if (range === undefined) {
    return createRangeNotSatisfiableResponse(object, assetId)
  }

  const normalizedRange: {length?: number; offset?: number; suffix?: number} = {...range}
  const requestedLength =
    normalizedRange.suffix === undefined
      ? (normalizedRange.length ?? object.size - (normalizedRange.offset ?? 0))
      : Math.min(normalizedRange.suffix, object.size)
  const offset =
    normalizedRange.suffix === undefined
      ? (normalizedRange.offset ?? 0)
      : object.size - requestedLength
  const contentLength = Math.min(requestedLength, object.size - offset)

  if (
    object.size === 0 ||
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(contentLength) ||
    offset < 0 ||
    offset >= object.size ||
    contentLength <= 0
  ) {
    return createRangeNotSatisfiableResponse(object, assetId)
  }

  const headers = createObjectHeaders(object, assetId)
  headers.set('Content-Length', contentLength.toString())
  headers.set('Content-Range', `bytes ${offset}-${offset + contentLength - 1}/${object.size}`)
  return new Response(object.body, {headers, status: HTTP_PARTIAL_CONTENT})
}
