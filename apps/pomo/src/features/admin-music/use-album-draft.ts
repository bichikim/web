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

interface UseAlbumDraftProps {
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
  options: UseAlbumDraftProps,
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

const persistDraftData = async (
  draft: AlbumDraftData,
  setMessage: Setter<string | null>,
): Promise<void> => {
  try {
    const {writeAlbumDraftData} = await getAlbumDraftStorage()

    if (!writeAlbumDraftData(draft).success) {
      setMessage('브라우저에 초안을 저장하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.')
    }
  } catch (error) {
    console.warn('Failed to load the album draft storage.', error)
    setMessage('브라우저 초안 저장 기능을 불러오지 못했습니다. 이 탭을 닫지 마세요.')
  }
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

type DraftField = 'cover' | 'coverFallback' | 'coverImageUrl' | 'translations'

interface DraftFieldHandlerOptions {
  readonly markEdited: (field: DraftField) => void
  readonly persistDraft: () => void
  readonly setCoverFallback: Setter<AlbumDraftData['coverFallback']>
  readonly setCoverImageUrl: Setter<string>
  readonly setTranslations: Setter<AlbumDraftTranslations>
}

const createDraftFieldHandlers = (options: DraftFieldHandlerOptions) => ({
  handleCoverFallbackChange: (event: Event & {currentTarget: HTMLSelectElement}): void => {
    const fallback = coverFallbackSchema.safeParse(event.currentTarget.value)

    if (fallback.success) {
      options.markEdited('coverFallback')
      options.setCoverFallback(fallback.data)
      options.persistDraft()
    }
  },
  handleCoverImageUrlInput: (event: InputEvent & {currentTarget: HTMLInputElement}): void => {
    options.markEdited('coverImageUrl')
    options.setCoverImageUrl(event.currentTarget.value)
    options.persistDraft()
  },
  handleTranslationsChange: (translations: AlbumDraftTranslations): void => {
    options.markEdited('translations')
    options.setTranslations(translations)
    options.persistDraft()
  },
})

interface CreateAlbumSubmitHandlerOptions extends UseAlbumDraftProps {
  readonly clearPreparedCover: () => void
  readonly getCoverDraftId: () => string | null
  readonly getCoverFile: () => File | null
  readonly getDraftData: () => AlbumDraftData
  readonly setCoverDraftId: Setter<string | null>
  readonly setCoverFallback: Setter<AlbumDraftData['coverFallback']>
  readonly setCoverImageUrl: Setter<string>
  readonly setIsSavingAlbum: Setter<boolean>
  readonly setTranslations: Setter<AlbumDraftTranslations>
}

const createAlbumSubmitHandler = (
  options: CreateAlbumSubmitHandlerOptions,
): JSX.EventHandler<HTMLFormElement, SubmitEvent> =>
  async function handleAlbumSubmit(event) {
    event.preventDefault()
    const albumForm = event.currentTarget
    options.setIsSavingAlbum(true)
    options.setMessage(null)

    try {
      const albumId = await createAlbum(options.getDraftData(), options.getCoverFile())
      const savedCoverDraftId = options.getCoverDraftId()
      albumForm.reset()
      options.clearPreparedCover()
      options.setCoverDraftId(null)
      options.setTranslations(createEmptyAlbumTranslations())
      options.setCoverImageUrl('')
      options.setCoverFallback('lp')
      const {deleteAlbumDraft} = await getAlbumDraftStorage()
      const deletionResult = await deleteAlbumDraft(savedCoverDraftId)
      await refreshAfterAlbumCreation(options, albumId, deletionResult.success)
    } catch (error) {
      options.setMessage(error instanceof Error ? error.message : '앨범을 저장하지 못했습니다.')
    } finally {
      options.setIsSavingAlbum(false)
    }
  }

interface CreateDraftDataGetterOptions {
  readonly getCoverDraftId: () => string | null
  readonly getCoverFallback: () => AlbumDraftData['coverFallback']
  readonly getCoverFile: () => File | null
  readonly getCoverImageUrl: () => string
  readonly getTranslations: () => AlbumDraftTranslations
}

const createDraftDataGetter = (options: CreateDraftDataGetterOptions) => (): AlbumDraftData => ({
  coverDraftId: options.getCoverDraftId(),
  coverFallback: options.getCoverFallback(),
  coverImageUrl: options.getCoverImageUrl(),
  hasCoverFile: options.getCoverFile() !== null,
  translations: options.getTranslations(),
})

const createDraftPersistence = (
  getDraftData: () => AlbumDraftData,
  setMessage: Setter<string | null>,
): (() => void) => {
  let persistence = Promise.resolve()
  return () => {
    const draft = getDraftData()
    persistence = persistence.then(() => persistDraftData(draft, setMessage))
  }
}

const createConditionalDraftPersistence =
  (canPersist: () => boolean, persistDraft: () => void): (() => void) =>
  () => {
    if (canPersist()) {
      persistDraft()
    }
  }

interface DraftRestorationBarrier {
  readonly finish: () => void
  readonly wait: () => Promise<void>
}

const createDraftRestorationBarrier = (): DraftRestorationBarrier => {
  let finish!: () => void
  const completion = new Promise<void>((resolve) => {
    finish = resolve
  })
  return {finish, wait: () => completion}
}

interface ApplyRestoredDraftOptions {
  readonly editedFields: ReadonlySet<DraftField>
  readonly setCoverDraftId: Setter<string | null>
  readonly setCoverFallback: Setter<AlbumDraftData['coverFallback']>
  readonly setCoverImageUrl: Setter<string>
  readonly setCoverPreviewUrl: Setter<string | null>
  readonly setPreparedCoverFile: Setter<File | null>
  readonly setTranslations: Setter<AlbumDraftTranslations>
}

const applyRestoredDraft = (
  restoredDraft: RestoredAlbumDraft | null,
  options: ApplyRestoredDraftOptions,
): void => {
  if (restoredDraft === null) {
    return
  }

  const {coverFile, draft} = restoredDraft
  if (!options.editedFields.has('translations')) {
    options.setTranslations(draft.translations)
  }
  if (!options.editedFields.has('coverImageUrl')) {
    options.setCoverImageUrl(draft.coverImageUrl)
  }
  if (!options.editedFields.has('coverFallback')) {
    options.setCoverFallback(draft.coverFallback)
  }

  if (!options.editedFields.has('cover')) {
    options.setCoverDraftId(draft.coverDraftId)
    if (coverFile !== null) {
      options.setPreparedCoverFile(coverFile)
      options.setCoverPreviewUrl(URL.createObjectURL(coverFile))
    }
  }
}

interface RegisterDraftRestorationOptions {
  readonly applyDraft: (restoredDraft: RestoredAlbumDraft | null) => void
  readonly getIsDisposed: () => boolean
  readonly onFinished: () => void
  readonly setIsRestoringDraft: Setter<boolean>
  readonly setMessage: Setter<string | null>
}

const registerDraftRestoration = (options: RegisterDraftRestorationOptions): void => {
  onMount(async () => {
    try {
      const restoredDraft = await restoreAlbumDraft()

      if (options.getIsDisposed()) {
        return
      }

      options.applyDraft(restoredDraft)
      if (restoredDraft !== null) {
        options.setMessage('작성 중이던 앨범 초안을 복원했습니다.')
      }
    } catch (error) {
      if (options.getIsDisposed()) {
        return
      }
      console.warn('Failed to restore the admin album draft.', error)
      options.setMessage(
        '브라우저 초안을 복원하지 못했습니다. 새로 입력한 내용은 이 탭에 유지됩니다.',
      )
    } finally {
      options.onFinished()
      if (!options.getIsDisposed()) {
        options.setIsRestoringDraft(false)
      }
    }
  })
}

export const useAlbumDraft = (props: UseAlbumDraftProps) => {
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
  const editedFields = new Set<DraftField>()
  let isDisposed = false
  const restorationBarrier = createDraftRestorationBarrier()

  const getDraftData = createDraftDataGetter({
    getCoverDraftId: coverDraftId,
    getCoverFallback: coverFallback,
    getCoverFile: preparedCoverFile,
    getCoverImageUrl: coverImageUrl,
    getTranslations: albumTranslations,
  })
  const persistDraft = createDraftPersistence(getDraftData, props.setMessage)
  const persistEditedDraft = createConditionalDraftPersistence(
    () => !isRestoringDraft(),
    persistDraft,
  )
  const draftFieldHandlers = createDraftFieldHandlers({
    markEdited: (field) => {
      editedFields.add(field)
    },
    persistDraft: persistEditedDraft,
    setCoverFallback,
    setCoverImageUrl,
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
    restorationBarrier.finish()
    clearPreparedCover()
  })

  registerDraftRestoration({
    applyDraft: (restoredDraft) => {
      applyRestoredDraft(restoredDraft, {
        editedFields,
        setCoverDraftId,
        setCoverFallback,
        setCoverImageUrl,
        setCoverPreviewUrl,
        setPreparedCoverFile,
        setTranslations: setAlbumTranslations,
      })

      if (editedFields.size > 0 && !editedFields.has('cover')) {
        persistDraft()
      }
    },
    getIsDisposed: () => isDisposed,
    onFinished: restorationBarrier.finish,
    setIsRestoringDraft,
    setMessage: props.setMessage,
  })

  const handleAlbumSubmit = createAlbumSubmitHandler({
    ...props,
    clearPreparedCover,
    getCoverDraftId: coverDraftId,
    getCoverFile: preparedCoverFile,
    getDraftData,
    setCoverDraftId,
    setCoverFallback,
    setCoverImageUrl,
    setIsSavingAlbum,
    setTranslations: setAlbumTranslations,
  })

  const handleCoverChange: JSX.EventHandler<HTMLInputElement, Event> = async (event) => {
    const file = event.currentTarget.files?.item(0) ?? null
    const input = event.currentTarget
    coverPreparationId += 1
    props.setMessage(null)

    if (file === null) {
      const previousCoverDraftId = coverDraftId()
      editedFields.add('cover')
      clearPreparedCover()
      setCoverDraftId(null)
      const clearingId = coverPreparationId
      await restorationBarrier.wait()

      if (isDisposed || clearingId !== coverPreparationId) {
        return
      }

      props.setMessage(await removePreparedCoverDraft(previousCoverDraftId, getDraftData()))
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
      editedFields.add('cover')
      setPreparedCoverFile(preparedFile)
      setCoverDraftId(nextCoverDraftId)
      setCoverPreviewUrl(URL.createObjectURL(preparedFile))
      await restorationBarrier.wait()

      if (isDisposed || preparationId !== coverPreparationId) {
        return
      }

      props.setMessage(
        await persistPreparedCover({
          draft: getDraftData(),
          file: preparedFile,
          nextCoverDraftId,
          previousCoverDraftId,
        }),
      )
    } catch (error) {
      input.value = ''
      props.setMessage(
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
