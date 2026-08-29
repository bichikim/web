import {readStoredAppSession} from '../user-auth/app-session'

interface PreviewTrackAccess {
  readonly mode: 'preview'
  readonly url: string
}

interface FullTrackAccess {
  readonly expiresAt: string
  readonly mode: 'full'
  readonly url: string
}

type TrackAccess = FullTrackAccess | PreviewTrackAccess
const HTTP_UNAUTHORIZED = 401
interface TrackPreviewAuthenticationRequired {
  readonly ok: false
  readonly reason: 'authentication-required'
}

interface TrackPreviewSource {
  readonly ok: true
  readonly release?: () => void
  readonly source: string
}

export type TrackPreviewSourceResult = TrackPreviewAuthenticationRequired | TrackPreviewSource
const UUID_REGEXP = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
// Keep client buffering aligned with the server's bounded preview object limit.
// oxlint-disable-next-line eslint/no-magic-numbers -- Preview response limit is two MiB.
const MAXIMUM_PREVIEW_BYTES = 2 * 1024 * 1024
const getApiOrigin = (): string => import.meta.env.POMO_PUBLIC_ORIGIN
const usesRemotePublicOrigin = (): boolean =>
  import.meta.env.POMO_IS_APPS_IN_TOSS || import.meta.env.POMO_IS_DESKTOP

const isTrackAccess = (value: unknown, trackId: string): value is TrackAccess => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const access = value as Readonly<Record<string, unknown>>

  if (access.mode === 'preview') {
    if (typeof access.url !== 'string') {
      return false
    }

    try {
      const apiOrigin = new URL(getApiOrigin()).origin
      const previewUrl = new URL(access.url, apiOrigin)
      const assetId = previewUrl.searchParams.get('asset')
      return (
        previewUrl.origin === apiOrigin &&
        previewUrl.pathname === `/api/music/tracks/${trackId}/preview` &&
        previewUrl.searchParams.size === 2 &&
        assetId !== null &&
        UUID_REGEXP.test(assetId) &&
        previewUrl.searchParams.has('token')
      )
    } catch {
      return false
    }
  }

  if (
    access.mode !== 'full' ||
    typeof access.expiresAt !== 'string' ||
    typeof access.url !== 'string'
  ) {
    return false
  }

  try {
    return new URL(access.url).protocol === 'https:'
  } catch {
    return false
  }
}

const getOptionalAuthorizationHeaders = async (): Promise<HeadersInit | undefined> => {
  try {
    const token = await readStoredAppSession()
    return token === null ? undefined : {Authorization: `Bearer ${token}`}
  } catch {
    return undefined
  }
}

const loadPreviewBlob = async (source: string): Promise<TrackPreviewSource> => {
  const response = await fetch(source)
  const contentLength = Number(response.headers.get('Content-Length'))

  if (
    !response.ok ||
    response.headers.get('Content-Type') !== 'audio/mpeg' ||
    !Number.isSafeInteger(contentLength) ||
    contentLength <= 0 ||
    contentLength > MAXIMUM_PREVIEW_BYTES
  ) {
    throw new TypeError('Track preview audio response is invalid')
  }

  const blob = await response.blob()

  if (blob.size !== contentLength) {
    throw new TypeError('Track preview audio length is invalid')
  }

  const objectUrl = URL.createObjectURL(blob)
  return {ok: true, release: () => URL.revokeObjectURL(objectUrl), source: objectUrl}
}

export const loadTrackPreviewSource = async (
  trackId: string,
): Promise<TrackPreviewSourceResult> => {
  const accessPath = `/api/music/tracks/${encodeURIComponent(trackId)}/access`
  const endpoint = usesRemotePublicOrigin()
    ? new URL(accessPath, getApiOrigin()).toString()
    : accessPath
  const response = await fetch(endpoint, {
    cache: 'no-store',
    credentials: 'include',
    headers: await getOptionalAuthorizationHeaders(),
  })

  if (response.status === HTTP_UNAUTHORIZED) {
    return {ok: false, reason: 'authentication-required'}
  }

  if (!response.ok) {
    throw new Error(`Track access request failed: ${response.status}`)
  }

  const access: unknown = await response.json()

  if (!isTrackAccess(access, trackId)) {
    throw new TypeError('Track access response has an invalid format')
  }

  const source =
    access.mode === 'preview' && usesRemotePublicOrigin()
      ? new URL(access.url, getApiOrigin()).toString()
      : access.url

  return access.mode === 'preview' ? loadPreviewBlob(source) : {ok: true, source}
}
