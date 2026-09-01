import {type JSX, type Setter} from 'solid-js'

import {
  type AlbumDraftData,
  type AlbumDraftTranslations,
  createEmptyAlbumTranslations,
} from './album-draft'

export interface AlbumCreationServices {
  readonly clearDraft: (coverDraftId: string | null) => Promise<boolean>
  readonly createAlbum: (draft: AlbumDraftData, coverFile: File | null) => Promise<string>
}

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
  readonly services: AlbumCreationServices
  readonly setAlbumId: Setter<string | null>
  readonly setCoverDraftId: Setter<string | null>
  readonly setCoverFallback: Setter<AlbumDraftData['coverFallback']>
  readonly setCoverImageUrl: Setter<string>
  readonly setIsSavingAlbum: Setter<boolean>
  readonly setTranslations: Setter<AlbumDraftTranslations>
  readonly waitForDraftPersistence: () => Promise<void>
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
      albumId = await options.services.createAlbum(options.getDraftData(), options.getCoverFile())
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
      const didClearDraft = await options.services.clearDraft(coverDraftId)
      await refreshAfterAlbumCreation(options, albumId, didClearDraft)
    } finally {
      options.setIsSavingAlbum(false)
    }
  }
