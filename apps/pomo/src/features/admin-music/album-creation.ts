import {getExceptionMessage} from '../error-detail'
import {type JSX, type Setter} from 'solid-js'

import {
  type AlbumDraftData,
  type AlbumDraftTranslations,
  createEmptyAlbumTranslations,
  hasSameAlbumDraft,
} from './album-draft'

export interface AlbumCreationServices {
  readonly clearDraft: (
    coverDraftId: string | null,
    expectedDraft?: AlbumDraftData,
  ) => Promise<boolean>
  readonly createAlbum: (
    draft: AlbumDraftData,
    coverFile: File | null,
  ) => Promise<AlbumCreationResult>
}

interface AlbumCreationPayloadMismatch {
  readonly code: 'album_creation_payload_mismatch'
  readonly success: false
}

interface AlbumCreationSuccess {
  readonly albumId: string
  readonly success: true
}

export type AlbumCreationResult = AlbumCreationPayloadMismatch | AlbumCreationSuccess

export interface AlbumCreationCallbacks {
  readonly onAlbumCreated?: (albumId: string) => void
  readonly refreshCatalog: () => Promise<void>
  readonly setMessage: Setter<string | null>
}

export interface CreateAlbumSubmitHandlerOptions extends AlbumCreationCallbacks {
  readonly clearPreparedCover: () => void
  readonly getCoverDraftId: () => string | null
  readonly getCoverFile: () => File | null
  readonly getCoverStorageWarning?: () => string | null
  readonly getDraftData: () => AlbumDraftData
  readonly getIsProcessingCover: () => boolean
  readonly persistDraft: () => Promise<AlbumDraftData | null>
  readonly renewAlbumId: () => void
  readonly services: AlbumCreationServices
  readonly setAlbumId: Setter<string | null>
  readonly setCoverDraftId: Setter<string | null>
  readonly setCoverFallback: Setter<AlbumDraftData['coverFallback']>
  readonly setCoverImageUrl: Setter<string>
  readonly setIsSavingAlbum: Setter<boolean>
  readonly setTranslations: Setter<AlbumDraftTranslations>
  readonly waitForDraftPersistence: () => Promise<void>
}

interface AlbumCreationRefreshOptions {
  readonly albumId: string
  readonly didClearDraft: boolean
  readonly didPreserveDraft: boolean
  readonly getCoverStorageWarning: () => string | null
}

const refreshAfterAlbumCreation = async (
  options: AlbumCreationCallbacks,
  result: AlbumCreationRefreshOptions,
): Promise<void> => {
  const {albumId, didClearDraft, didPreserveDraft, getCoverStorageWarning} = result
  let didRefreshCatalog = true

  try {
    await options.refreshCatalog()
  } catch {
    didRefreshCatalog = false
  }

  options.onAlbumCreated?.(albumId)
  const coverStorageWarning = getCoverStorageWarning()

  if (!didRefreshCatalog) {
    options.setMessage(
      withCoverStorageWarning(
        coverStorageWarning,
        didPreserveDraft
          ? '앨범은 만들었지만 목록을 새로고침하지 못했습니다. 제출 중 수정한 초안은 유지했습니다.'
          : didClearDraft
            ? '앨범은 만들었지만 목록을 새로고침하지 못했습니다.'
            : '앨범은 만들었지만 목록을 새로고침하지 못했고 브라우저의 작성 초안도 지우지 못했습니다.',
      ),
    )
    return
  }

  options.setMessage(
    withCoverStorageWarning(
      coverStorageWarning,
      didPreserveDraft
        ? '앨범을 만들었고 제출 중 수정한 초안을 유지했습니다.'
        : didClearDraft
          ? '앨범 초안을 만들었습니다.'
          : '앨범은 만들었지만 브라우저의 작성 초안을 지우지 못했습니다.',
    ),
  )
}

const withCoverStorageWarning = (warning: string | null, message: string): string =>
  warning === null || warning === message ? message : `${warning}\n${message}`

const includeCoverStorageWarning = (
  options: CreateAlbumSubmitHandlerOptions,
  message: string,
): string => {
  const warning = options.getCoverStorageWarning?.()
  return withCoverStorageWarning(warning ?? null, message)
}

const recoverFromPayloadMismatch = async (
  options: CreateAlbumSubmitHandlerOptions,
): Promise<void> => {
  options.renewAlbumId()
  await options.persistDraft()
  await options.waitForDraftPersistence()

  try {
    await options.refreshCatalog()
    options.setMessage(
      includeCoverStorageWarning(
        options,
        '이전 요청에서 앨범이 이미 만들어졌습니다. 현재 입력은 유지하고 새 앨범 ID로 전환했습니다. 목록에서 기존 앨범을 확인한 뒤 필요하면 다시 저장해 주세요.',
      ),
    )
  } catch {
    options.setMessage(
      includeCoverStorageWarning(
        options,
        '이전 요청에서 앨범이 이미 만들어졌지만 목록을 새로고침하지 못했습니다. 현재 입력은 유지하고 새 앨범 ID로 전환했으니 페이지를 새로고침한 뒤 확인해 주세요.',
      ),
    )
  }
}

export const createAlbumSubmitHandler = (
  options: CreateAlbumSubmitHandlerOptions,
): JSX.EventHandler<HTMLFormElement, SubmitEvent> =>
  async function handleAlbumSubmit(event) {
    event.preventDefault()
    const albumForm = event.currentTarget
    options.setIsSavingAlbum(true)
    options.setMessage(options.getCoverStorageWarning?.() ?? null)

    let albumId: string
    const submittedDraft = options.getDraftData()
    const submittedCoverFile = options.getCoverFile()
    let persistedDraft: AlbumDraftData | null = null

    try {
      persistedDraft = await options.persistDraft()
      await options.waitForDraftPersistence()
      const result = await options.services.createAlbum(submittedDraft, submittedCoverFile)

      if (!result.success) {
        await recoverFromPayloadMismatch(options)
        options.setIsSavingAlbum(false)
        return
      }

      const {albumId: createdAlbumId} = result
      albumId = createdAlbumId
    } catch (error) {
      options.setMessage(
        includeCoverStorageWarning(
          options,
          getExceptionMessage(error, '앨범을 저장하지 못했습니다.'),
        ),
      )
      options.setIsSavingAlbum(false)
      return
    }

    try {
      const isDraftUnchanged =
        !options.getIsProcessingCover() && hasSameAlbumDraft(options.getDraftData(), submittedDraft)
      let didClearDraft = false

      if (isDraftUnchanged) {
        albumForm.reset()
        options.clearPreparedCover()
        options.setAlbumId(null)
        options.setCoverDraftId(null)
        options.setTranslations(createEmptyAlbumTranslations())
        options.setCoverImageUrl('')
        options.setCoverFallback('lp')
        didClearDraft =
          persistedDraft === null
            ? false
            : await options.services.clearDraft(persistedDraft.coverDraftId, persistedDraft)
      } else {
        options.renewAlbumId()
        await options.persistDraft()
        await options.waitForDraftPersistence()
      }

      await refreshAfterAlbumCreation(options, {
        albumId,
        didClearDraft,
        didPreserveDraft: !isDraftUnchanged,
        getCoverStorageWarning: () => options.getCoverStorageWarning?.() ?? null,
      })
    } finally {
      options.setIsSavingAlbum(false)
    }
  }
