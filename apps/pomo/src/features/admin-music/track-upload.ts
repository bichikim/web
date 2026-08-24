import {z} from 'zod'

// Keep client validation aligned with the server-side paid source limit.
// oxlint-disable-next-line eslint/no-magic-numbers -- Paid source MP3 limit is 250 MiB.
export const MAXIMUM_TRACK_BYTES = 250 * 1024 * 1024
const uploadSchema = z.object({
  assetId: z.string().uuid(),
  expiresAt: z.string().datetime(),
  uploadUrl: z.string().url(),
})

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

export const uploadTrackAudio = async (trackId: string, file: File): Promise<void> => {
  validateTrackAudio(file)
  const reservationResponse = await requireSuccess(
    await fetch('/api/admin/music/assets', {
      body: JSON.stringify({trackId}),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    }),
    'MP3 업로드를 준비하지 못했습니다.',
  )
  const reservation = uploadSchema.parse(await reservationResponse.json())
  await requireSuccess(
    await fetch(reservation.uploadUrl, {
      body: file,
      headers: {'Content-Type': 'audio/mpeg'},
      method: 'PUT',
    }),
    'MP3를 R2에 업로드하지 못했습니다.',
  )
  await requireSuccess(
    await fetch('/api/admin/music/assets', {
      body: JSON.stringify({assetId: reservation.assetId}),
      headers: {'Content-Type': 'application/json'},
      method: 'PUT',
    }),
    'MP3 형식 또는 재생 시간을 검증하지 못했습니다.',
  )
}
