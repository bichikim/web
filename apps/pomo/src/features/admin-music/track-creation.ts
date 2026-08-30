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

const createTrack = async (body: Readonly<Record<string, unknown>>): Promise<string> => {
  const response = await fetch('/api/admin/music/tracks', {
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('곡 정보를 저장하지 못했습니다.')
  }

  return createdTrackSchema.parse(await response.json()).id
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
  const trackId = await createTrack({
    albumId: input.albumId,
    artist: input.artist,
    title: input.title,
  })

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
