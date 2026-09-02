import {z} from 'zod'

import {type AlbumCreationResult, type AlbumCreationServices} from './album-creation'
import {ALBUM_LOCALES, type AlbumDraftData} from './album-draft'
import {uploadAlbumCover} from './cover-upload'

const getAlbumDraftStorage = () => import('./album-draft-storage')
const HTTP_CONFLICT = 409
const payloadMismatchSchema = z.object({error: z.literal('album_creation_payload_mismatch')})

const createAlbum = async (
  draft: AlbumDraftData,
  coverFile: File | null,
): Promise<AlbumCreationResult> => {
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
      id: draft.albumId,
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
    if (response.status === HTTP_CONFLICT) {
      const errorBody: unknown = await response.json().catch(() => null)

      if (payloadMismatchSchema.safeParse(errorBody).success) {
        return {code: 'album_creation_payload_mismatch', success: false}
      }
    }

    throw new Error('저장하지 못했습니다. 입력값과 로그인 상태를 확인해 주세요.')
  }

  return {albumId: z.object({id: z.string()}).parse(await response.json()).id, success: true}
}

const clearDraft = async (coverDraftId: string | null): Promise<boolean> => {
  try {
    const {deleteAlbumDraft} = await getAlbumDraftStorage()
    return (await deleteAlbumDraft(coverDraftId)).success
  } catch (error) {
    console.warn('Failed to clear the created album draft.', error)
    return false
  }
}

export const albumCreationServices = {clearDraft, createAlbum} satisfies AlbumCreationServices
