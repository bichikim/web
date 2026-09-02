import {z} from 'zod'

import {ALBUM_LOCALES, type AlbumDraftData} from './album-draft'
import {uploadAlbumCover} from './cover-upload'

const createdAlbumSchema = z.object({id: z.string()})

/** Creates an album after uploading its prepared cover when present. */
export const createAlbum = async (
  draft: AlbumDraftData,
  coverFile: File | null,
): Promise<string> => {
  const configuredCoverImageUrl = draft.coverImageUrl.trim()
  const uploadedCover =
    coverFile === null ? null : await uploadAlbumCover(coverFile, draft.coverDraftId)
  const coverImageUrl = uploadedCover?.coverImageUrl ?? configuredCoverImageUrl
  const response = await fetch('/api/admin/music/albums', {
    body: JSON.stringify({
      coverDraftId: uploadedCover === null ? null : draft.coverDraftId,
      coverFallback: draft.coverFallback,
      coverImageUrl: coverImageUrl === '' ? null : coverImageUrl,
      coverReservationId: uploadedCover?.coverReservationId ?? null,
      translations: ALBUM_LOCALES.map((locale) => ({
        description: draft.translations[locale].description.trim(),
        locale,
        title: draft.translations[locale].title.trim(),
      })).filter(
        (translation) =>
          translation.locale === 'ko' ||
          translation.title.length > 0 ||
          translation.description.length > 0,
      ),
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('저장하지 못했습니다. 입력값과 로그인 상태를 확인해 주세요.')
  }

  return createdAlbumSchema.parse(await response.json()).id
}
