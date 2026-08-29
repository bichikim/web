import {z} from 'zod'

// Keep client validation aligned with the server-side paid source limit.
// oxlint-disable-next-line eslint/no-magic-numbers -- Paid source MP3 limit is 250 MiB.
export const MAXIMUM_TRACK_BYTES = 250 * 1024 * 1024
const COMPLETION_ATTEMPT_COUNT = 2
const HTTP_SERVER_ERROR_MINIMUM = 500
const uploadSchema = z.object({
  assetId: z.string().uuid(),
  expiresAt: z.string().datetime(),
  uploadUrl: z.string().url(),
})

interface UploadTrackAudioOptions {
  readonly file: File
  readonly trackId: string
}

type TrackCompletionAttempt =
  | {readonly kind: 'active'}
  | {readonly error: unknown; readonly kind: 'ambiguous'}
  | {readonly error: Error; readonly kind: 'rejected'}

interface ActiveTrackAudioUploadResult {
  readonly status: 'active'
}

interface UnconfirmedTrackAudioUploadResult {
  readonly error: Error
  readonly status: 'unconfirmed'
}

export type TrackAudioUploadResult =
  | ActiveTrackAudioUploadResult
  | UnconfirmedTrackAudioUploadResult

export const validateTrackAudio = (file: File): void => {
  const hasMp3Type = file.type === 'audio/mpeg' || file.type === 'audio/mp3'
  const hasMp3Extension = file.name.toLowerCase().endsWith('.mp3')

  if (!hasMp3Type && !hasMp3Extension) {
    throw new TypeError('MP3 파일만 업로드할 수 있습니다.')
  }

  if (file.size <= 0 || file.size > MAXIMUM_TRACK_BYTES) {
    throw new TypeError('MP3 파일은 250MB 이하여야 합니다.')
  }
}

const requireSuccess = async (response: Response, message: string): Promise<Response> => {
  if (!response.ok) {
    throw new Error(message)
  }

  return response
}

const requestTrackCompletion = async (assetId: string): Promise<TrackCompletionAttempt> => {
  let response: Response

  try {
    response = await fetch('/api/admin/music/assets', {
      body: JSON.stringify({assetId}),
      headers: {'Content-Type': 'application/json'},
      method: 'PUT',
    })
  } catch (error: unknown) {
    return {error, kind: 'ambiguous'}
  }

  if (response.ok) {
    return {kind: 'active'}
  }

  if (response.status >= HTTP_SERVER_ERROR_MINIMUM) {
    return {
      error: new Error(`MP3 등록 상태 확인 요청이 ${response.status} 응답을 반환했습니다.`),
      kind: 'ambiguous',
    }
  }

  return {
    error: new Error('MP3 형식 또는 재생 시간을 검증하지 못했습니다.'),
    kind: 'rejected',
  }
}

const createUnconfirmedUploadResult = (cause: unknown): UnconfirmedTrackAudioUploadResult => ({
  error: new Error('MP3 등록 상태를 확인하지 못했습니다.', {cause}),
  status: 'unconfirmed',
})

export const confirmTrackAudioRegistration = async (
  assetId: string,
): Promise<TrackAudioUploadResult> => {
  let hasAmbiguousAttempt = false
  let lastError: unknown

  for (let attemptIndex = 0; attemptIndex < COMPLETION_ATTEMPT_COUNT; attemptIndex += 1) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- Completion checks must reuse one asset in request order.
    const attempt = await requestTrackCompletion(assetId)

    switch (attempt.kind) {
      case 'active':
        return {status: 'active'}
      case 'ambiguous':
        hasAmbiguousAttempt = true
        lastError = attempt.error
        break
      case 'rejected': {
        if (hasAmbiguousAttempt) {
          return createUnconfirmedUploadResult(attempt.error)
        }

        throw attempt.error
      }
      // The typed completion result cannot reach this exhaustive guard.
      /* v8 ignore next 4 */
      default: {
        const exhaustiveAttempt: never = attempt
        return exhaustiveAttempt
      }
    }
  }

  return createUnconfirmedUploadResult(lastError)
}

export const uploadTrackAudio = async (
  options: UploadTrackAudioOptions,
): Promise<TrackAudioUploadResult> => {
  validateTrackAudio(options.file)
  const reservationResponse = await requireSuccess(
    await fetch('/api/admin/music/assets', {
      body: JSON.stringify({trackId: options.trackId}),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    }),
    'MP3 업로드를 준비하지 못했습니다.',
  )
  const reservation = uploadSchema.parse(await reservationResponse.json())
  await requireSuccess(
    await fetch(reservation.uploadUrl, {
      body: options.file,
      headers: {'Content-Type': 'audio/mpeg'},
      method: 'PUT',
    }),
    'MP3를 R2에 업로드하지 못했습니다.',
  )
  return confirmTrackAudioRegistration(reservation.assetId)
}
