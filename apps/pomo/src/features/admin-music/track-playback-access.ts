import {apiJsonRequest, parseJsonResponse} from '../api-json'
import {z} from 'zod'

const playbackResponseSchema = z.object({
  expiresAt: z.string().datetime(),
  url: z.string().url(),
})

export interface AdminTrackPlaybackAccess {
  readonly expiresAt: string
  readonly url: string
}

/** Requests one-time administrator playback access for a track. */
export const requestAdminTrackPlaybackAccess = async (
  trackId: string,
): Promise<AdminTrackPlaybackAccess> => {
  const response = await apiJsonRequest(
    `admin/music/tracks/${encodeURIComponent(trackId)}/playback`,
    {retry: false},
  )

  if (!response.ok) {
    throw new Error(`Playback access failed with status ${response.status}`)
  }

  return parseJsonResponse(response, playbackResponseSchema)
}
