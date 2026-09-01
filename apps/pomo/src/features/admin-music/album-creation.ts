import {type JSX, type Setter} from 'solid-js'
import {z} from 'zod'

import {
  ALBUM_LOCALES,
  type AlbumDraftData,
  type AlbumDraftTranslations,
  createEmptyAlbumTranslations,
} from './album-draft'
import {uploadAlbumCover} from './cover-upload'

const getAlbumDraftStorage = () => import('./album-draft-storage')

export interface AlbumCreationCallbacks {
  readonly onAlbumCreated?: (albumId: string) => void
  readonly refreshCatalog: () => Promise<void>
  readonly setMessage: Setter<string | null>
}

export interface CreateAlbumSubmitHandlerOptions extends AlbumCreationCallbacks {
  readonly clearPreparedCover: () => void
  readonly getCoverDraftId: () => string | null
  readonly getCoverFile: () => File | null
  readonly getDraftData: () => AlbumDraftData
  readonly persistDraft: () => void
  readonly setAlbumId: Setter<string | null>
  readonly setCoverDraftId: Setter<string | null>
  readonly setCoverFallback: Setter<AlbumDraftData['coverFallback']>
  readonly setCoverImageUrl: Setter<string>
  readonly setIsSavingAlbum: Setter<boolean>
  readonly setTranslations: Setter<AlbumDraftTranslations>
  readonly waitForDraftPersistence: () => Promise<void>
}

const createAlbum = async (draft: AlbumDraftData, coverFile: File | null): Promise<string> => {
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
    throw new Error('저장하지 못했습니다. 입력값과 로그인 상태를 확인해 주세요.')
  }

  return z.object({id: z.string()}).parse(await response.json()).id
}

const refreshAfterAlbumCreation = async (
  options: AlbumCreationCallbacks,
  albumId: string,
  didClearDraft: boolean,
): Promise<void> => {
  let didRefreshCatalog = true

  try {
    await options.refreshCatalog()
  } catch {
    didRefreshCatalog = false
  }

  options.onAlbumCreated?.(albumId)

  if (!didRefreshCatalog) {
    options.setMessage(
      didClearDraft
        ? '앨범은 만들었지만 목록을 새로고침하지 못했습니다.'
        : '앨범은 만들었지만 목록을 새로고침하지 못했고 브라우저의 작성 초안도 지우지 못했습니다.',
    )
    return
  }

  options.setMessage(
    didClearDraft
      ? '앨범 초안을 만들었습니다.'
      : '앨범은 만들었지만 브라우저의 작성 초안을 지우지 못했습니다.',
  )
}

const clearCreatedAlbumDraft = async (coverDraftId: string | null): Promise<boolean> => {
  try {
    const {deleteAlbumDraft} = await getAlbumDraftStorage()
    return (await deleteAlbumDraft(coverDraftId)).success
  } catch (error) {
    console.warn('Failed to clear the created album draft.', error)
    return false
  }
}

export const createAlbumSubmitHandler = (
  options: CreateAlbumSubmitHandlerOptions,
): JSX.EventHandler<HTMLFormElement, SubmitEvent> =>
  async function handleAlbumSubmit(event) {
    event.preventDefault()
    const albumForm = event.currentTarget
    options.setIsSavingAlbum(true)
    options.setMessage(null)

    let albumId: string

    try {
      options.persistDraft()
      await options.waitForDraftPersistence()
      albumId = await createAlbum(options.getDraftData(), options.getCoverFile())
    } catch (error) {
      options.setMessage(error instanceof Error ? error.message : '앨범을 저장하지 못했습니다.')
      options.setIsSavingAlbum(false)
      return
    }

    try {
      const coverDraftId = options.getCoverDraftId()
      albumForm.reset()
      options.clearPreparedCover()
      options.setAlbumId(null)
      options.setCoverDraftId(null)
      options.setTranslations(createEmptyAlbumTranslations())
      options.setCoverImageUrl('')
      options.setCoverFallback('lp')
      const didClearDraft = await clearCreatedAlbumDraft(coverDraftId)
      await refreshAfterAlbumCreation(options, albumId, didClearDraft)
    } finally {
      options.setIsSavingAlbum(false)
    }
  }
