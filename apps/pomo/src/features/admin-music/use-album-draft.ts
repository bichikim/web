import {createSignal, type JSX, onCleanup, onMount, type Setter} from 'solid-js'
import {z} from 'zod'

import {
  ALBUM_LOCALES,
  type AlbumDraftData,
  type AlbumDraftTranslations,
  createEmptyAlbumTranslations,
} from './album-draft'
import {uploadAlbumCover, validateAlbumCover} from './cover-upload'

const getAlbumDraftStorage = () => import('./album-draft-storage')
const coverFallbackSchema = z.enum(['lp', 'cd', 'music'])

interface AlbumDraftOptions {
  readonly onAlbumCreated?: (albumId: string) => void
  readonly refreshCatalog: () => Promise<void>
  readonly setMessage: Setter<string | null>
}

const createAlbum = async (draft: AlbumDraftData, coverFile: File | null): Promise<string> => {
  const configuredCoverImageUrl = draft.coverImageUrl.trim()
  const uploadedCoverImageUrl =
    coverFile === null
      ? configuredCoverImageUrl
      : await uploadAlbumCover(coverFile, draft.coverDraftId)
  const response = await fetch('/api/admin/music/albums', {
    body: JSON.stringify({
      coverFallback: draft.coverFallback,
      coverImageUrl: uploadedCoverImageUrl === '' ? null : uploadedCoverImageUrl,
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
  options: AlbumDraftOptions,
  albumId: string,
  didClearDraft: boolean,
): Promise<void> => {
  try {
    await options.refreshCatalog()
    options.onAlbumCreated?.(albumId)
    options.setMessage(
      didClearDraft
        ? '앨범 초안을 만들었습니다.'
        : '앨범은 만들었지만 브라우저의 작성 초안을 지우지 못했습니다.',
    )
  } catch {
    options.setMessage('앨범은 만들었지만 목록을 새로고침하지 못했습니다.')
  }
}

const clearCoverPreview = (
  currentUrl: string | null,
  setCoverPreviewUrl: Setter<string | null>,
): void => {
  if (currentUrl !== null) {
    URL.revokeObjectURL(currentUrl)
    setCoverPreviewUrl(null)
  }
}

const persistDraftData = (
  getDraftData: () => AlbumDraftData,
  setMessage: Setter<string | null>,
): void => {
  const draft = getDraftData()
  getAlbumDraftStorage()
    .then(({writeAlbumDraftData}) => {
      if (!writeAlbumDraftData(draft).success) {
        setMessage('브라우저에 초안을 저장하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.')
      }
    })
    .catch((error: unknown) => {
      console.warn('Failed to load the album draft storage.', error)
      setMessage('브라우저 초안 저장 기능을 불러오지 못했습니다. 이 탭을 닫지 마세요.')
    })
}

interface RestoredAlbumDraft {
  readonly coverFile: File | null
  readonly draft: AlbumDraftData
}

const restoreAlbumDraft = async (): Promise<RestoredAlbumDraft | null> => {
  const {
    deleteExpiredAlbumDraftCovers,
    readAlbumDraftCover,
    readAlbumDraftData,
    writeAlbumDraftData,
  } = await getAlbumDraftStorage()
  const draft = readAlbumDraftData()
  await deleteExpiredAlbumDraftCovers({activeCoverDraftId: draft?.coverDraftId ?? null})

  if (draft === null) {
    return null
  }

  if (!draft.hasCoverFile || draft.coverDraftId === null) {
    const normalizedDraft = draft.hasCoverFile ? {...draft, hasCoverFile: false} : draft

    if (draft.hasCoverFile) {
      writeAlbumDraftData(normalizedDraft)
    }

    return {coverFile: null, draft: normalizedDraft}
  }

  const coverFile = await readAlbumDraftCover(draft.coverDraftId)

  if (coverFile !== null) {
    return {coverFile, draft}
  }

  const normalizedDraft = {...draft, coverDraftId: null, hasCoverFile: false}
  writeAlbumDraftData(normalizedDraft)
  return {coverFile: null, draft: normalizedDraft}
}

const removePreparedCoverDraft = async (
  previousCoverDraftId: string | null,
  draft: AlbumDraftData,
): Promise<string | null> => {
  const {deleteAlbumDraftCover, writeAlbumDraftData} = await getAlbumDraftStorage()
  const dataWriteResult = writeAlbumDraftData(draft)

  if (!dataWriteResult.success) {
    return '커버는 화면에서 지웠지만 브라우저 초안을 갱신하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.'
  }

  if (previousCoverDraftId !== null) {
    await deleteAlbumDraftCover(previousCoverDraftId)
  }

  return null
}

interface PersistPreparedCoverOptions {
  readonly draft: AlbumDraftData
  readonly file: File
  readonly nextCoverDraftId: string
  readonly previousCoverDraftId: string | null
}

const persistPreparedCover = async ({
  draft,
  file,
  nextCoverDraftId,
  previousCoverDraftId,
}: PersistPreparedCoverOptions): Promise<string> => {
  const {deleteAlbumDraftCover, writeAlbumDraftCover, writeAlbumDraftData} =
    await getAlbumDraftStorage()
  const coverWriteResult = await writeAlbumDraftCover(nextCoverDraftId, file)

  if (!coverWriteResult.success) {
    return '커버는 준비했지만 브라우저에 저장하지 못했습니다. 이 탭을 닫기 전에 앨범을 만들어 주세요.'
  }

  const dataWriteResult = writeAlbumDraftData(draft)

  if (!dataWriteResult.success) {
    await deleteAlbumDraftCover(nextCoverDraftId)
    return '커버는 준비했지만 브라우저에 초안을 저장하지 못했습니다. 이 탭을 닫기 전에 앨범을 만들어 주세요.'
  }

  if (previousCoverDraftId !== null) {
    await deleteAlbumDraftCover(previousCoverDraftId)
  }

  return '커버를 중앙 정사각형으로 자르고 1200×1200 WebP로 준비했습니다.'
}

interface DraftFieldHandlerOptions {
  readonly getDraftData: () => AlbumDraftData
  readonly setCoverFallback: Setter<AlbumDraftData['coverFallback']>
  readonly setCoverImageUrl: Setter<string>
  readonly setMessage: Setter<string | null>
  readonly setTranslations: Setter<AlbumDraftTranslations>
}

const createDraftFieldHandlers = (options: DraftFieldHandlerOptions) => ({
  handleCoverFallbackChange: (event: Event & {currentTarget: HTMLSelectElement}): void => {
    const fallback = coverFallbackSchema.safeParse(event.currentTarget.value)

    if (fallback.success) {
      options.setCoverFallback(fallback.data)
      persistDraftData(options.getDraftData, options.setMessage)
    }
  },
  handleCoverImageUrlInput: (event: InputEvent & {currentTarget: HTMLInputElement}): void => {
    options.setCoverImageUrl(event.currentTarget.value)
    persistDraftData(options.getDraftData, options.setMessage)
  },
  handleTranslationsChange: (translations: AlbumDraftTranslations): void => {
    options.setTranslations(translations)
    persistDraftData(options.getDraftData, options.setMessage)
  },
})

export const useAlbumDraft = (options: AlbumDraftOptions) => {
  const [isSavingAlbum, setIsSavingAlbum] = createSignal(false)
  const [isProcessingCover, setIsProcessingCover] = createSignal(false)
  const [isRestoringDraft, setIsRestoringDraft] = createSignal(true)
  const [coverPreviewUrl, setCoverPreviewUrl] = createSignal<string | null>(null)
  const [preparedCoverFile, setPreparedCoverFile] = createSignal<File | null>(null)
  const [albumTranslations, setAlbumTranslations] = createSignal<AlbumDraftTranslations>(
    createEmptyAlbumTranslations(),
  )
  const [coverImageUrl, setCoverImageUrl] = createSignal('')
  const [coverFallback, setCoverFallback] = createSignal<AlbumDraftData['coverFallback']>('lp')
  const [coverDraftId, setCoverDraftId] = createSignal<string | null>(null)
  let coverPreparationId = 0
  let isDisposed = false

  const getDraftData = (): AlbumDraftData => ({
    coverDraftId: coverDraftId(),
    coverFallback: coverFallback(),
    coverImageUrl: coverImageUrl(),
    hasCoverFile: preparedCoverFile() !== null,
    translations: albumTranslations(),
  })
  const draftFieldHandlers = createDraftFieldHandlers({
    getDraftData,
    setCoverFallback,
    setCoverImageUrl,
    setMessage: options.setMessage,
    setTranslations: setAlbumTranslations,
  })
  const clearPreparedCover = (): void => {
    coverPreparationId += 1
    clearCoverPreview(coverPreviewUrl(), setCoverPreviewUrl)
    setPreparedCoverFile(null)
    setIsProcessingCover(false)
  }

  onCleanup(() => {
    isDisposed = true
    clearPreparedCover()
  })

  onMount(async () => {
    try {
      const restoredDraft = await restoreAlbumDraft()

      if (isDisposed || restoredDraft === null) {
        return
      }

      const {coverFile, draft} = restoredDraft
      setAlbumTranslations(draft.translations)
      setCoverImageUrl(draft.coverImageUrl)
      setCoverFallback(draft.coverFallback)
      setCoverDraftId(draft.coverDraftId)

      if (coverFile !== null) {
        setPreparedCoverFile(coverFile)
        setCoverPreviewUrl(URL.createObjectURL(coverFile))
      }

      options.setMessage('작성 중이던 앨범 초안을 복원했습니다.')
    } catch (error) {
      if (isDisposed) {
        return
      }

      console.warn('Failed to restore the admin album draft.', error)
      options.setMessage(
        '브라우저 초안을 복원하지 못했습니다. 새로 입력한 내용은 이 탭에 유지됩니다.',
      )
    } finally {
      if (!isDisposed) {
        setIsRestoringDraft(false)
      }
    }
  })

  const handleAlbumSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    const albumForm = event.currentTarget
    setIsSavingAlbum(true)
    options.setMessage(null)

    try {
      const albumId = await createAlbum(getDraftData(), preparedCoverFile())
      const savedCoverDraftId = coverDraftId()
      albumForm.reset()
      clearPreparedCover()
      setCoverDraftId(null)
      setAlbumTranslations(createEmptyAlbumTranslations())
      setCoverImageUrl('')
      setCoverFallback('lp')
      const {deleteAlbumDraft} = await getAlbumDraftStorage()
      const deletionResult = await deleteAlbumDraft(savedCoverDraftId)
      await refreshAfterAlbumCreation(options, albumId, deletionResult.success)
    } catch (error) {
      options.setMessage(error instanceof Error ? error.message : '앨범을 저장하지 못했습니다.')
    } finally {
      setIsSavingAlbum(false)
    }
  }

  const handleCoverChange: JSX.EventHandler<HTMLInputElement, Event> = async (event) => {
    const file = event.currentTarget.files?.item(0) ?? null
    const input = event.currentTarget
    coverPreparationId += 1
    options.setMessage(null)

    if (file === null) {
      const previousCoverDraftId = coverDraftId()
      clearPreparedCover()
      setCoverDraftId(null)
      options.setMessage(await removePreparedCoverDraft(previousCoverDraftId, getDraftData()))
      return
    }

    const preparationId = coverPreparationId

    try {
      validateAlbumCover(file)
      setIsProcessingCover(true)
      const {prepareAlbumCover} = await import('./cover-image')
      const preparedFile = await prepareAlbumCover(file)

      if (preparationId !== coverPreparationId) {
        return
      }

      clearCoverPreview(coverPreviewUrl(), setCoverPreviewUrl)
      const previousCoverDraftId = coverDraftId()
      const nextCoverDraftId = crypto.randomUUID()
      setPreparedCoverFile(preparedFile)
      setCoverDraftId(nextCoverDraftId)
      setCoverPreviewUrl(URL.createObjectURL(preparedFile))
      options.setMessage(
        await persistPreparedCover({
          draft: getDraftData(),
          file: preparedFile,
          nextCoverDraftId,
          previousCoverDraftId,
        }),
      )
    } catch (error) {
      input.value = ''
      options.setMessage(
        error instanceof Error ? error.message : '커버 이미지를 선택하지 못했습니다.',
      )
    } finally {
      if (preparationId === coverPreparationId) {
        setIsProcessingCover(false)
      }
    }
  }

  return {
    ...draftFieldHandlers,
    albumTranslations,
    coverFallback,
    coverImageUrl,
    coverPreviewUrl,
    handleAlbumSubmit,
    handleCoverChange,
    isProcessingCover,
    isRestoringDraft,
    isSavingAlbum,
  }
}
