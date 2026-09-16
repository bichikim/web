import {z} from 'zod'

import {uploadTrackAudio} from './track-upload'

const createdTrackSchema = z.object({id: z.string().uuid()})

interface CreateTrackWithAudioInput {
  readonly albumId: string
  readonly artist: string
  readonly audio: File
  readonly title: string
}

interface CreateTrackWithAudioSuccess {
  readonly success: true
}

interface CreateTrackWithAudioFailure {
  readonly cleanupStatus: 'failed' | 'preserved' | 'succeeded'
  readonly error: unknown
  readonly success: false
}

export type CreateTrackWithAudioResult = CreateTrackWithAudioFailure | CreateTrackWithAudioSuccess

interface CreatedTrack {
  readonly status: 'created'
  readonly id: string
}
interface UnconfirmedTrack {
  readonly status: 'unconfirmed'
  readonly error: unknown
}

interface RejectedTrack {
  readonly status: 'rejected'
  readonly error: Error
}

const HTTP_BAD_REQUEST = 400
const HTTP_SERVER_ERROR = 500

const createTrack = async (
  body: Readonly<Record<string, unknown>>,
): Promise<CreatedTrack | UnconfirmedTrack | RejectedTrack> => {
  try {
    const response = await fetch('/api/admin/music/tracks', {
      body: JSON.stringify(body),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })
    if (!response.ok) {
      const error = new Error('곡 정보를 저장하지 못했습니다.')
      return {
        error,
        status:
          response.status >= HTTP_BAD_REQUEST && response.status < HTTP_SERVER_ERROR
            ? 'rejected'
            : 'unconfirmed',
      }
    }
    return {id: createdTrackSchema.parse(await response.json()).id, status: 'created'}
  } catch (error) {
    return {error, status: 'unconfirmed'}
  }
}

export const removeTrack = async (trackId: string): Promise<void> => {
  const response = await fetch(`/api/admin/music/tracks/${encodeURIComponent(trackId)}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('수록곡을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

export const createTrackWithAudio = async (
  input: CreateTrackWithAudioInput,
): Promise<CreateTrackWithAudioResult> => {
  const track = await createTrack({
    albumId: input.albumId,
    artist: input.artist,
    title: input.title,
  })

  if (track.status === 'rejected') {
    throw track.error
  }
  if (track.status === 'unconfirmed') {
    return {cleanupStatus: 'preserved', error: track.error, success: false}
  }
  const trackId = track.id

  try {
    const uploadResult = await uploadTrackAudio({file: input.audio, trackId})

    if (uploadResult.status === 'unconfirmed') {
      return {cleanupStatus: 'preserved', error: uploadResult.error, success: false}
    }

    return {success: true}
  } catch (error) {
    const cleanupSucceeded = await removeTrack(trackId)
      .then(() => true)
      .catch(() => false)
    return {
      cleanupStatus: cleanupSucceeded ? 'succeeded' : 'failed',
      error,
      success: false,
    }
  }
}
