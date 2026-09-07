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
  const response = await fetch(`/api/admin/music/tracks/${encodeURIComponent(trackId)}/playback`)

  if (!response.ok) {
    throw new Error(`Playback access failed with status ${response.status}`)
  }

  return playbackResponseSchema.parse(await response.json())
}
