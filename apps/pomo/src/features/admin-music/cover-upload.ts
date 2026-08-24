import {z} from 'zod'

// oxlint-disable-next-line eslint/no-magic-numbers -- Product upload limit is ten MiB.
export const MAXIMUM_COVER_BYTES = 10 * 1024 * 1024
// Keep the server upload below the Vercel Function request limit after client-side conversion.
// oxlint-disable-next-line eslint/no-magic-numbers -- Prepared cover upload limit is four MiB.
export const MAXIMUM_PREPARED_COVER_BYTES = 4 * 1024 * 1024
const ALLOWED_COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const uploadSchema = z.object({
  coverImageUrl: z.string().url(),
})

export const validateAlbumCover = (file: File): void => {
  if (!ALLOWED_COVER_TYPES.has(file.type)) {
    throw new TypeError('JPG, PNG 또는 WebP 이미지만 업로드할 수 있습니다.')
  }

  if (file.size <= 0 || file.size > MAXIMUM_COVER_BYTES) {
    throw new TypeError('커버 이미지는 10MB 이하여야 합니다.')
  }
}

export const uploadAlbumCover = async (
  file: File,
  coverDraftId: string | null,
): Promise<string> => {
  if (file.type !== 'image/webp' || file.size <= 0 || file.size > MAXIMUM_PREPARED_COVER_BYTES) {
    throw new TypeError('준비된 커버 이미지는 4MB 이하 WebP여야 합니다.')
  }

  if (coverDraftId === null) {
    throw new TypeError('커버 이미지 초안 ID가 없습니다. 커버를 다시 선택해 주세요.')
  }

  const uploadResponse = await fetch('/api/admin/music/covers', {
    body: file,
    headers: {'Content-Type': 'image/webp', 'X-Pomo-Cover-Id': coverDraftId},
    method: 'POST',
  })

  if (!uploadResponse.ok) {
    throw new Error('커버 이미지를 R2에 업로드하지 못했습니다.')
  }

  return uploadSchema.parse(await uploadResponse.json()).coverImageUrl
}
