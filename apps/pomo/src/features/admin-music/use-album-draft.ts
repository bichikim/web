import {useAction, useSubmission} from '@solidjs/router'
import {createSignal, type JSX, onCleanup, type Setter} from 'solid-js'
import {z} from 'zod'

import {
  type AlbumCreationCallbacks,
  type AlbumCreationServices,
  createAlbumSubmitHandler,
} from './album-creation'
import {albumCreationServices} from './album-creation-adapter'
import {
  ALBUM_LOCALES,
  type AlbumDraftData,
  type AlbumDraftTranslations,
  createEmptyAlbumTranslations,
} from './album-draft'
import {createAdminAlbumAction, type CreateAlbumActionResult} from './actions'
import {validateAlbumCover} from './cover-upload'
import {registerDraftRestoration, type RestoredAlbumDraft} from './draft-reference'
import {
  createDraftReferenceLifecycle,
  type DraftReferenceUpdater,
} from './create-draft-reference-lifecycle'

const getAlbumDraftStorage = () => import('./album-draft-storage')
const coverFallbackSchema = z.enum(['lp', 'cd', 'music'])
const COVER_SELECTION_ERROR = '커버 이미지를 선택하지 못했습니다.'

type UseAlbumDraftProps = AlbumCreationCallbacks

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
  updateDraftReference: DraftReferenceUpdater,
): Promise<void> => {
  try {
    const {writeAlbumDraftData} = await getAlbumDraftStorage()

    if (!writeAlbumDraftData(draft).success) {
      setMessage('브라우저에 초안을 저장하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.')
      return
    }

    if (!(await updateDraftReference(draft.coverDraftId)).success) {
      setMessage(
        '브라우저 초안은 저장했지만 다른 탭과 커버 참조를 동기화하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.',
      )
    }
  } catch (error) {
    console.warn('Failed to load the album draft storage.', error)
    setMessage('브라우저 초안 저장 기능을 불러오지 못했습니다. 이 탭을 닫지 마세요.')
  }
}

const removePreparedCoverDraft = async (
  previousCoverDraftId: string | null,
  draft: AlbumDraftData,
  updateDraftReference: DraftReferenceUpdater,
): Promise<string | null> => {
  const {deleteAlbumDraftCover, writeAlbumDraftData} = await getAlbumDraftStorage()
  const dataWriteResult = writeAlbumDraftData(draft)

  if (!dataWriteResult.success) {
    return '커버는 화면에서 지웠지만 브라우저 초안을 갱신하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.'
  }

  if (!(await updateDraftReference(null)).success) {
    return '커버는 화면에서 지웠지만 다른 탭과 커버 참조를 동기화하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.'
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
  readonly updateDraftReference: DraftReferenceUpdater
}

const persistPreparedCover = async ({
  draft,
  file,
  nextCoverDraftId,
  previousCoverDraftId,
  updateDraftReference,
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

  if (!(await updateDraftReference(nextCoverDraftId)).success) {
    return '커버는 준비했지만 다른 탭과 커버 참조를 동기화하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.'
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

interface CreateDraftDataGetterOptions {
  readonly getAlbumId: () => string
  readonly getCoverDraftId: () => string | null
  readonly getCoverFallback: () => AlbumDraftData['coverFallback']
  readonly getCoverFile: () => File | null
  readonly getCoverImageUrl: () => string
  readonly getTranslations: () => AlbumDraftTranslations
}

const createDraftDataGetter = (options: CreateDraftDataGetterOptions) => (): AlbumDraftData => ({
  albumId: options.getAlbumId(),
  coverDraftId: options.getCoverDraftId(),
  coverFallback: options.getCoverFallback(),
  coverImageUrl: options.getCoverImageUrl(),
  hasCoverFile: options.getCoverFile() !== null,
  translations: options.getTranslations(),
})

interface DraftPersistence {
  readonly persist: () => void
  readonly wait: () => Promise<void>
}

const createDraftPersistence = (
  getDraftData: () => AlbumDraftData,
  setMessage: Setter<string | null>,
  updateDraftReference: DraftReferenceUpdater,
): DraftPersistence => {
  let persistence = Promise.resolve()
  return {
    persist: () => {
      const draft = getDraftData()
      persistence = persistence.then(() =>
        persistDraftData(draft, setMessage, updateDraftReference),
      )
    },
    wait: () => persistence,
  }
}

const createGuardedPersistence =
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

interface AlbumCreationId {
  readonly get: () => string
  readonly renew: () => void
  readonly set: Setter<string | null>
}

const useAlbumCreationId = (): AlbumCreationId => {
  const [albumId, setAlbumId] = createSignal<string | null>(null)
  return {
    get: () => {
      const currentAlbumId = albumId()

      if (currentAlbumId !== null) {
        return currentAlbumId
      }

      const nextAlbumId = crypto.randomUUID()
      setAlbumId(nextAlbumId)
      return nextAlbumId
    },
    renew: () => setAlbumId(crypto.randomUUID()),
    set: setAlbumId,
  }
}

const registerAlbumDraftCleanup = (
  lifecycle: {disposed: boolean},
  finishRestoration: () => void,
  clearPreparedCover: () => void,
): void => {
  onCleanup(() => {
    lifecycle.disposed = true
    finishRestoration()
    clearPreparedCover()
  })
}

interface ApplyRestoredDraftOptions {
  readonly setAlbumId: Setter<string | null>
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
  options.setAlbumId(draft.albumId ?? crypto.randomUUID())
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

const useCreateAlbumAction = () => ({
  submission: useSubmission(createAdminAlbumAction),
  submit: useAction(createAdminAlbumAction),
})

const createAlbumThroughAction = async (
  submit: (values: FormData) => Promise<CreateAlbumActionResult>,
  clearSubmission: () => void,
  draft: AlbumDraftData,
  coverFile: File | null,
): ReturnType<AlbumCreationServices['createAlbum']> => {
  const values = new FormData()
  values.set('albumId', draft.albumId ?? '')
  values.set('coverDraftId', draft.coverDraftId ?? '')
  values.set('coverFallback', draft.coverFallback)
  values.set('coverImageUrl', draft.coverImageUrl)
  for (const locale of ALBUM_LOCALES) {
    values.set(`description.${locale}`, draft.translations[locale].description)
    values.set(`title.${locale}`, draft.translations[locale].title)
  }
  if (coverFile !== null) {
    values.set('coverFile', coverFile)
  }

  const result = await submit(values)
  clearSubmission()
  if (result.status === 'rejected') {
    throw new Error(result.detail)
  }

  return result.status === 'created'
    ? {albumId: result.albumId, success: true}
    : {code: 'album_creation_payload_mismatch', success: false}
}

const createActionAlbumCreationServices = (
  albumAction: ReturnType<typeof useCreateAlbumAction>,
  updateDraftReference: DraftReferenceUpdater,
): AlbumCreationServices => ({
  clearDraft: async (coverDraftId) => {
    const didClearDraft = await albumCreationServices.clearDraft(coverDraftId)

    if (didClearDraft) {
      await updateDraftReference(null)
    }

    return didClearDraft
  },
  createAlbum: (draft, coverFile) =>
    createAlbumThroughAction(
      albumAction.submit,
      () => albumAction.submission.clear(),
      draft,
      coverFile,
    ),
})

const persistRestoredEdits = (editedFields: ReadonlySet<DraftField>, persist: () => void): void => {
  if (editedFields.size > 0 && !editedFields.has('cover')) {
    persist()
  }
}

interface CoverPreparationState {
  id: number
}

interface CreateCoverChangeHandlerOptions {
  readonly clearPreparedCover: () => void
  readonly coverPreparation: CoverPreparationState
  readonly getCoverDraftId: () => string | null
  readonly getCoverPreviewUrl: () => string | null
  readonly getDraftData: () => AlbumDraftData
  readonly getIsDisposed: () => boolean
  readonly markCoverEdited: () => void
  readonly restorationBarrier: DraftRestorationBarrier
  readonly setCoverDraftId: Setter<string | null>
  readonly setCoverPreviewUrl: Setter<string | null>
  readonly setIsProcessingCover: Setter<boolean>
  readonly setMessage: Setter<string | null>
  readonly setPreparedCoverFile: Setter<File | null>
  readonly updateDraftReference: DraftReferenceUpdater
}

const createCoverChangeHandler =
  (options: CreateCoverChangeHandlerOptions): JSX.EventHandler<HTMLInputElement, Event> =>
  async (event) => {
    const file = event.currentTarget.files?.item(0) ?? null
    const input = event.currentTarget
    options.coverPreparation.id += 1
    options.setMessage(null)

    if (file === null) {
      const previousCoverDraftId = options.getCoverDraftId()
      options.markCoverEdited()
      options.clearPreparedCover()
      options.setCoverDraftId(null)
      const clearingId = options.coverPreparation.id
      await options.restorationBarrier.wait()
      if (options.getIsDisposed() || clearingId !== options.coverPreparation.id) {
        return
      }

      const message = await removePreparedCoverDraft(
        previousCoverDraftId,
        options.getDraftData(),
        options.updateDraftReference,
      )
      options.setMessage(message)
      return
    }

    const preparationId = options.coverPreparation.id
    try {
      validateAlbumCover(file)
      options.setIsProcessingCover(true)
      const {prepareAlbumCover} = await import('./cover-image')
      const preparedFile = await prepareAlbumCover(file)

      if (preparationId !== options.coverPreparation.id) {
        return
      }

      clearCoverPreview(options.getCoverPreviewUrl(), options.setCoverPreviewUrl)
      const previousCoverDraftId = options.getCoverDraftId()
      const nextCoverDraftId = crypto.randomUUID()
      options.markCoverEdited()
      options.setPreparedCoverFile(preparedFile)
      options.setCoverDraftId(nextCoverDraftId)
      options.setCoverPreviewUrl(URL.createObjectURL(preparedFile))
      await options.restorationBarrier.wait()

      if (options.getIsDisposed() || preparationId !== options.coverPreparation.id) {
        return
      }

      const message = await persistPreparedCover({
        draft: options.getDraftData(),
        file: preparedFile,
        nextCoverDraftId,
        previousCoverDraftId,
        updateDraftReference: options.updateDraftReference,
      })
      options.setMessage(message)
    } catch (error) {
      input.value = ''
      options.setMessage(error instanceof Error ? error.message : COVER_SELECTION_ERROR)
    } finally {
      if (preparationId === options.coverPreparation.id) {
        options.setIsProcessingCover(false)
      }
    }
  }

export const useAlbumDraft = (props: UseAlbumDraftProps) => {
  const albumAction = useCreateAlbumAction()
  const albumCreationId = useAlbumCreationId()
  const draftReference = createDraftReferenceLifecycle({loadStorage: getAlbumDraftStorage})
  const [isSavingAlbumWorkflow, setIsSavingAlbumWorkflow] = createSignal(false)
  const [isProcessingCover, setIsProcessingCover] = createSignal(false)
  const [isRestoringDraft, setIsRestoringDraft] = createSignal(true)
  const [coverPreviewUrl, setCoverPreviewUrl] = createSignal<string | null>(null)
  const [preparedCoverFile, setPreparedCoverFile] = createSignal<File | null>(null)
  const [albumTranslations, setAlbumTranslations] = createSignal(createEmptyAlbumTranslations())
  const [coverImageUrl, setCoverImageUrl] = createSignal('')
  const [coverFallback, setCoverFallback] = createSignal<AlbumDraftData['coverFallback']>('lp')
  const [coverDraftId, setCoverDraftId] = createSignal<string | null>(null)
  const coverPreparation = {id: 0}
  const editedFields = new Set<DraftField>()
  const lifecycle = {disposed: false}
  const restorationBarrier = createDraftRestorationBarrier()
  const getDraftData = createDraftDataGetter({
    getAlbumId: albumCreationId.get,
    getCoverDraftId: coverDraftId,
    getCoverFallback: coverFallback,
    getCoverFile: preparedCoverFile,
    getCoverImageUrl: coverImageUrl,
    getTranslations: albumTranslations,
  })
  const draftPersistence = createDraftPersistence(
    getDraftData,
    props.setMessage,
    draftReference.update,
  )
  const persistEditedDraft = createGuardedPersistence(
    () => !isRestoringDraft(),
    draftPersistence.persist,
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
    coverPreparation.id += 1
    clearCoverPreview(coverPreviewUrl(), setCoverPreviewUrl)
    setPreparedCoverFile(null)
    setIsProcessingCover(false)
  }
  registerAlbumDraftCleanup(lifecycle, restorationBarrier.finish, clearPreparedCover)
  registerDraftRestoration({
    applyDraft: (restoredDraft) => {
      applyRestoredDraft(restoredDraft, {
        editedFields,
        setAlbumId: albumCreationId.set,
        setCoverDraftId,
        setCoverFallback,
        setCoverImageUrl,
        setCoverPreviewUrl,
        setPreparedCoverFile,
        setTranslations: setAlbumTranslations,
      })

      persistRestoredEdits(editedFields, draftPersistence.persist)
    },
    getDraftReferenceCoverDraftId: draftReference.getCoverDraftId,
    getIsDisposed: () => lifecycle.disposed,
    onFinished: restorationBarrier.finish,
    releaseDraftReference: draftReference.release,
    setDraftReferenceId: draftReference.setId,
    setIsRestoringDraft,
    setMessage: props.setMessage,
    updateDraftReference: draftReference.update,
  })
  const handleAlbumSubmit = createAlbumSubmitHandler({
    ...props,
    clearPreparedCover,
    getCoverDraftId: coverDraftId,
    getCoverFile: preparedCoverFile,
    getDraftData,
    persistDraft: draftPersistence.persist,
    renewAlbumId: albumCreationId.renew,
    services: createActionAlbumCreationServices(albumAction, draftReference.update),
    setAlbumId: albumCreationId.set,
    setCoverDraftId,
    setCoverFallback,
    setCoverImageUrl,
    setIsSavingAlbum: setIsSavingAlbumWorkflow,
    setTranslations: setAlbumTranslations,
    waitForDraftPersistence: draftPersistence.wait,
  })
  const handleCoverChange = createCoverChangeHandler({
    clearPreparedCover,
    coverPreparation,
    getCoverDraftId: coverDraftId,
    getCoverPreviewUrl: coverPreviewUrl,
    getDraftData,
    getIsDisposed: () => lifecycle.disposed,
    markCoverEdited: () => {
      editedFields.add('cover')
    },
    restorationBarrier,
    setCoverDraftId,
    setCoverPreviewUrl,
    setIsProcessingCover,
    setMessage: props.setMessage,
    setPreparedCoverFile,
    updateDraftReference: draftReference.update,
  })
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
    isSavingAlbum: () => isSavingAlbumWorkflow() || albumAction.submission.pending === true,
  }
}
