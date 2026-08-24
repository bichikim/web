import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {findPublishedTrackPreviewAsset} from 'src/server/music/catalog-repository'
import {verifyPreviewAccess} from 'src/server/music/preview-access'
import {ensureTrackPreviewObject} from 'src/server/music/track-upload'

const HTTP_BAD_REQUEST = 400
const HTTP_PARTIAL_CONTENT = 206
const HTTP_RANGE_NOT_SATISFIABLE = 416
const HTTP_NOT_FOUND = 404
const HTTP_UNAUTHORIZED = 401
const HTTP_SERVICE_UNAVAILABLE = 503
const trackIdSchema = z.string().uuid()
const assetIdSchema = z.string().uuid()
const byteRangePattern = /^bytes=(?<start>\d*)-(?<end>\d*)$/u

interface ByteRange {
  readonly end: number
  readonly start: number
}

const parseByteRange = (value: string, contentLength: number): ByteRange | null => {
  const match = byteRangePattern.exec(value)
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

const errorResponse = (code: string, status: number): Response =>
  Response.json(
    {error: code},
    {
      headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'},
      status,
    },
  )

export const GET = async (event: APIEvent): Promise<Response> => {
  const parsedTrackId = trackIdSchema.safeParse(event.params.trackId)
  const parsedAssetId = assetIdSchema.safeParse(
    new URL(event.request.url).searchParams.get('asset'),
  )
  const token = new URL(event.request.url).searchParams.get('token')

  if (!parsedTrackId.success || !parsedAssetId.success || token === null) {
    return errorResponse('invalid_preview_request', HTTP_BAD_REQUEST)
  }

  try {
    const authorizedAsset = await verifyPreviewAccess({token})

    if (authorizedAsset?.assetId !== parsedAssetId.data) {
      return errorResponse('invalid_preview_token', HTTP_UNAUTHORIZED)
    }

    const asset = await findPublishedTrackPreviewAsset(parsedTrackId.data)

    if (
      asset === null ||
      asset.assetId !== authorizedAsset.assetId ||
      asset.objectKey !== authorizedAsset.objectKey
    ) {
      return errorResponse('track_not_found', HTTP_NOT_FOUND)
    }

    const preview = await ensureTrackPreviewObject(asset.objectKey, asset.durationMs)
    const headers = new Headers({
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=300',
      'Content-Length': preview.contentLength.toString(),
      'Content-Type': 'audio/mpeg',
      'X-Content-Type-Options': 'nosniff',
    })

    if (preview.etag !== null) {
      headers.set('ETag', preview.etag)
    }

    const rangeHeader = event.request.headers.get('Range')

    if (rangeHeader === null) {
      return new Response(preview.body, {headers})
    }

    const range = parseByteRange(rangeHeader, preview.contentLength)

    if (range === null) {
      headers.set('Content-Range', `bytes */${preview.contentLength}`)
      headers.delete('Content-Length')
      return new Response(null, {headers, status: HTTP_RANGE_NOT_SATISFIABLE})
    }

    const previewBytes = new Uint8Array(await new Response(preview.body).arrayBuffer())
    const rangeBytes = previewBytes.slice(range.start, range.end + 1)
    headers.set('Content-Length', rangeBytes.byteLength.toString())
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${preview.contentLength}`)
    return new Response(rangeBytes, {headers, status: HTTP_PARTIAL_CONTENT})
  } catch (error) {
    console.error('Failed to create authenticated music preview', error)
    return errorResponse('preview_unavailable', HTTP_SERVICE_UNAVAILABLE)
  }
}
