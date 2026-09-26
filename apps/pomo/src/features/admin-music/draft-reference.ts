import {uniq} from 'es-toolkit/array'
import {onCleanup, onMount, type Setter} from 'solid-js'

import type {AlbumDraftData} from './album-draft'
import type {AlbumDraftReadResult, AlbumDraftStorageResult} from './album-draft-storage'
import type {DraftReferenceUpdater} from './create-draft-reference-lifecycle'

const getAlbumDraftStorage = () => import('./album-draft-storage')
const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const DRAFT_REFERENCE_HEARTBEAT_MILLISECONDS =
  MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
const DRAFT_RESTORATION_STORAGE_WARNING =
  '브라우저 초안을 복원했지만 저장하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.'
const DRAFT_RESTORATION_READ_WARNING =
  '브라우저 초안을 읽지 못했습니다. 저장된 내용은 변경하지 않고 이 탭에 유지합니다.'
const DRAFT_RESTORATION_CLEANUP_WARNING =
  '브라우저 초안은 복원했지만 오래된 커버를 정리하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.'

export interface RestoredAlbumDraft {
  readonly coverFile: File | null
  readonly draft: AlbumDraftData
}

interface RestoreAlbumDraftOptions {
  readonly updateDraftReference: DraftReferenceUpdater
}

interface PrepareAlbumDraftRestorationOptions {
  readonly draft: AlbumDraftData | null
  readonly updateDraftReference: DraftReferenceUpdater
  readonly writeAlbumDraftData: (data: AlbumDraftData) => AlbumDraftStorageResult
}

type PreparedAlbumDraftRestoration =
  | {
      readonly cleanup: 'allowed' | 'skipped'
      readonly draft: AlbumDraftData | null
      readonly issue: RestorationIssue | null
      readonly status: 'continue'
    }
  | {
      readonly draft: AlbumDraftData
      readonly issue: RestorationIssue
      readonly status: 'stop'
    }

interface RestorationIssue {
  readonly error: Error
  readonly messages: readonly string[]
}

const createRestorationIssue = (
  operationMessage: string,
  userMessage: string,
  result: AlbumDraftStorageResult,
): RestorationIssue | null =>
  result.success
    ? null
    : {error: new Error(operationMessage, {cause: result.error}), messages: [userMessage]}

const createRestorationReadIssue = <T>(
  operationMessage: string,
  result: AlbumDraftReadResult<T>,
): RestorationIssue | null =>
  result.success
    ? null
    : {
        error: new Error(operationMessage, {cause: result.error}),
        messages: [DRAFT_RESTORATION_READ_WARNING],
      }

const combineRestorationIssues = (
  issues: readonly (RestorationIssue | null)[],
): RestorationIssue | null => {
  const failures = issues.filter((issue): issue is RestorationIssue => issue !== null)

  if (failures.length <= 1) {
    return failures[0] ?? null
  }

  return {
    error: new AggregateError(
      failures.map(({error}) => error),
      'Failed to restore the admin album draft.',
    ),
    messages: uniq(failures.flatMap(({messages}) => messages)),
  }
}

const requireRestorationIssue = (
  issues: readonly (RestorationIssue | null)[],
): RestorationIssue => {
  const issue = combineRestorationIssues(issues)
  if (issue === null) {
    throw new Error('A failed album draft restoration operation did not produce an issue.')
  }
  return issue
}

interface PersistNormalizedAlbumDraftOptions {
  readonly draft: AlbumDraftData
  readonly normalizedDraft: AlbumDraftData
  readonly updateDraftReference: DraftReferenceUpdater
  readonly writeAlbumDraftData: (data: AlbumDraftData) => AlbumDraftStorageResult
}

type PersistNormalizedAlbumDraftResult =
  | {readonly draft: AlbumDraftData; readonly status: 'persisted'}
  | {readonly draft: AlbumDraftData; readonly issue: RestorationIssue; readonly status: 'failed'}

const persistNormalizedAlbumDraft = async (
  options: PersistNormalizedAlbumDraftOptions,
): Promise<PersistNormalizedAlbumDraftResult> => {
  const {draft, normalizedDraft, updateDraftReference, writeAlbumDraftData} = options
  const dataWriteResult = writeAlbumDraftData(normalizedDraft)

  if (!dataWriteResult.success) {
    const referenceRestoreResult = await updateDraftReference(draft.coverDraftId)
    return {
      draft: normalizedDraft,
      issue: requireRestorationIssue([
        createRestorationIssue(
          'Failed to normalize the admin album draft.',
          DRAFT_RESTORATION_STORAGE_WARNING,
          dataWriteResult,
        ),
        createRestorationIssue(
          'Failed to restore the admin album draft reference after normalization failed.',
          DRAFT_RESTORATION_STORAGE_WARNING,
          referenceRestoreResult,
        ),
      ]),
      status: 'failed',
    }
  }

  const referenceWriteResult = await updateDraftReference(normalizedDraft.coverDraftId)

  if (!referenceWriteResult.success) {
    const referenceRestoreResult = await updateDraftReference(draft.coverDraftId)
    return {
      draft: normalizedDraft,
      issue: requireRestorationIssue([
        createRestorationIssue(
          'Failed to update the admin album draft reference during restoration.',
          DRAFT_RESTORATION_STORAGE_WARNING,
          referenceWriteResult,
        ),
        createRestorationIssue(
          'Failed to restore the admin album draft reference after restoration failed.',
          DRAFT_RESTORATION_STORAGE_WARNING,
          referenceRestoreResult,
        ),
      ]),
      status: 'failed',
    }
  }

  return {draft: normalizedDraft, status: 'persisted'}
}

const preparePersistedDraftRestoration = (
  result: PersistNormalizedAlbumDraftResult,
): PreparedAlbumDraftRestoration =>
  result.status === 'failed'
    ? {draft: result.draft, issue: result.issue, status: 'stop'}
    : {cleanup: 'allowed', draft: result.draft, issue: null, status: 'continue'}

const synchronizeDraftRestorationState = async (
  options: PrepareAlbumDraftRestorationOptions,
): Promise<PreparedAlbumDraftRestoration> => {
  const {draft, updateDraftReference, writeAlbumDraftData} = options

  if (draft === null) {
    const referenceWriteResult = await updateDraftReference(null)
    return {
      cleanup: referenceWriteResult.success ? 'allowed' : 'skipped',
      draft: null,
      issue: createRestorationIssue(
        'Failed to update the admin album draft reference during restoration.',
        DRAFT_RESTORATION_STORAGE_WARNING,
        referenceWriteResult,
      ),
      status: 'continue',
    }
  }

  if (!draft.hasCoverFile && draft.coverDraftId !== null) {
    return preparePersistedDraftRestoration(
      await persistNormalizedAlbumDraft({
        draft,
        normalizedDraft: {...draft, coverDraftId: null},
        updateDraftReference,
        writeAlbumDraftData,
      }),
    )
  }

  if (draft.hasCoverFile && draft.coverDraftId === null) {
    return preparePersistedDraftRestoration(
      await persistNormalizedAlbumDraft({
        draft,
        normalizedDraft: {...draft, hasCoverFile: false},
        updateDraftReference,
        writeAlbumDraftData,
      }),
    )
  }

  const referenceWriteResult = await updateDraftReference(draft.coverDraftId)
  return {
    cleanup: referenceWriteResult.success ? 'allowed' : 'skipped',
    draft,
    issue: createRestorationIssue(
      'Failed to update the admin album draft reference during restoration.',
      DRAFT_RESTORATION_STORAGE_WARNING,
      referenceWriteResult,
    ),
    status: 'continue',
  }
}

type RestoreAlbumDraftResult =
  | {readonly issue: RestorationIssue; readonly restoredDraft: null; readonly status: 'failed'}
  | {
      readonly issue: RestorationIssue | null
      readonly restoredDraft: RestoredAlbumDraft | null
      readonly status: 'completed'
    }

const restoreAlbumDraft = async (
  options: RestoreAlbumDraftOptions,
): Promise<RestoreAlbumDraftResult> => {
  const {
    deleteExpiredAlbumDraftCovers,
    readAlbumDraftCover,
    readAlbumDraftData,
    writeAlbumDraftData,
  } = await getAlbumDraftStorage()
  const draftReadResult = readAlbumDraftData()
  const draftReadIssue = createRestorationReadIssue(
    'Failed to read the admin album draft during restoration.',
    draftReadResult,
  )

  if (!draftReadResult.success) {
    return {
      issue: requireRestorationIssue([draftReadIssue]),
      restoredDraft: null,
      status: 'failed',
    }
  }

  const storedDraft = draftReadResult.data
  const preparedDraft = await synchronizeDraftRestorationState({
    draft: storedDraft,
    updateDraftReference: options.updateDraftReference,
    writeAlbumDraftData,
  })

  if (preparedDraft.status === 'stop') {
    return {
      issue: preparedDraft.issue,
      restoredDraft: {coverFile: null, draft: preparedDraft.draft},
      status: 'completed',
    }
  }

  const {draft} = preparedDraft
  const cleanupResult =
    preparedDraft.cleanup === 'allowed'
      ? await deleteExpiredAlbumDraftCovers({activeCoverDraftId: draft?.coverDraftId ?? null})
      : {success: true as const}
  const cleanupIssue = createRestorationIssue(
    'Failed to delete expired admin album cover drafts during restoration.',
    DRAFT_RESTORATION_CLEANUP_WARNING,
    cleanupResult,
  )
  const preparationIssue = combineRestorationIssues([preparedDraft.issue, cleanupIssue])

  if (draft === null) {
    return {issue: preparationIssue, restoredDraft: null, status: 'completed'}
  }

  if (draft !== storedDraft) {
    return {issue: preparationIssue, restoredDraft: {coverFile: null, draft}, status: 'completed'}
  }

  if (!draft.hasCoverFile || draft.coverDraftId === null) {
    return {issue: preparationIssue, restoredDraft: {coverFile: null, draft}, status: 'completed'}
  }

  const coverReadResult = await readAlbumDraftCover(draft.coverDraftId)

  if (!coverReadResult.success) {
    const coverReadIssue = createRestorationReadIssue(
      'Failed to read the admin album cover draft during restoration.',
      coverReadResult,
    )
    return {
      issue: combineRestorationIssues([preparationIssue, coverReadIssue]),
      restoredDraft: {coverFile: null, draft},
      status: 'completed',
    }
  }

  const coverFile = coverReadResult.data

  if (coverFile !== null) {
    return {issue: preparationIssue, restoredDraft: {coverFile, draft}, status: 'completed'}
  }

  const normalizedDraft = {...draft, coverDraftId: null, hasCoverFile: false}
  const normalizedDraftResult = await persistNormalizedAlbumDraft({
    draft,
    normalizedDraft,
    updateDraftReference: options.updateDraftReference,
    writeAlbumDraftData,
  })
  return {
    issue: combineRestorationIssues([
      preparationIssue,
      normalizedDraftResult.status === 'failed' ? normalizedDraftResult.issue : null,
    ]),
    restoredDraft: {coverFile: null, draft: normalizedDraftResult.draft},
    status: 'completed',
  }
}

export interface RegisterDraftRestorationOptions {
  readonly applyDraft: (restoredDraft: RestoredAlbumDraft | null) => void
  readonly getDraftReferenceCoverDraftId: () => string | null
  readonly getIsDisposed: () => boolean
  readonly onFinished: () => void
  readonly releaseDraftReference: () => Promise<void>
  readonly setDraftReferenceId: (id: string) => void
  readonly setIsRestoringDraft: Setter<boolean>
  readonly setMessage: Setter<string | null>
  readonly updateDraftReference: DraftReferenceUpdater
}

export const registerDraftRestoration = (options: RegisterDraftRestorationOptions): void => {
  onMount(() => {
    const referenceId = crypto.randomUUID()
    let isRestorationFinished = false
    options.setDraftReferenceId(referenceId)

    const refreshDraftReference = (): void => {
      if (!isRestorationFinished || options.getIsDisposed()) {
        return
      }

      options.updateDraftReference(options.getDraftReferenceCoverDraftId()).catch(() => undefined)
    }
    const heartbeat = globalThis.setInterval(
      refreshDraftReference,
      DRAFT_REFERENCE_HEARTBEAT_MILLISECONDS,
    )
    const handlePageHide = (event: PageTransitionEvent): void => {
      if (event.persisted) {
        return
      }

      options.releaseDraftReference().catch(() => undefined)
    }
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', refreshDraftReference)
    onCleanup(() => {
      globalThis.clearInterval(heartbeat)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('pageshow', refreshDraftReference)
      options.releaseDraftReference().catch(() => undefined)
    })

    const restore = async (): Promise<void> => {
      try {
        const restoration = await restoreAlbumDraft({
          updateDraftReference: options.updateDraftReference,
        })
        isRestorationFinished = true

        if (options.getIsDisposed()) {
          return
        }

        options.applyDraft(restoration.restoredDraft)
        if (restoration.issue !== null) {
          console.warn('Failed to restore the admin album draft.', restoration.issue.error)
          options.setMessage(restoration.issue.messages.join('\n'))
        } else if (restoration.restoredDraft !== null) {
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
    }
    restore().catch((error: unknown) => {
      console.warn('Failed to finish the admin album draft restoration.', error)
    })
  })
}
