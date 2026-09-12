import {onCleanup, onMount, type Setter} from 'solid-js'

import type {AlbumDraftData} from './album-draft'
import type {DraftReferenceUpdater} from './create-draft-reference-lifecycle'

const getAlbumDraftStorage = () => import('./album-draft-storage')
const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const DRAFT_REFERENCE_HEARTBEAT_MILLISECONDS =
  MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND

export interface RestoredAlbumDraft {
  readonly coverFile: File | null
  readonly draft: AlbumDraftData
}

interface RestoreAlbumDraftOptions {
  readonly updateDraftReference: DraftReferenceUpdater
}

const restoreAlbumDraft = async (
  options: RestoreAlbumDraftOptions,
): Promise<RestoredAlbumDraft | null> => {
  const {
    deleteExpiredAlbumDraftCovers,
    readAlbumDraftCover,
    readAlbumDraftData,
    writeAlbumDraftData,
  } = await getAlbumDraftStorage()
  const draft = readAlbumDraftData()

  await options.updateDraftReference(draft?.coverDraftId ?? null)

  await deleteExpiredAlbumDraftCovers({activeCoverDraftId: draft?.coverDraftId ?? null})

  if (draft === null) {
    return null
  }

  if (!draft.hasCoverFile || draft.coverDraftId === null) {
    const normalizedDraft = draft.hasCoverFile ? {...draft, hasCoverFile: false} : draft

    if (draft.hasCoverFile) {
      writeAlbumDraftData(normalizedDraft)
      await options.updateDraftReference(normalizedDraft.coverDraftId)
    }

    return {coverFile: null, draft: normalizedDraft}
  }

  const coverFile = await readAlbumDraftCover(draft.coverDraftId)

  if (coverFile !== null) {
    return {coverFile, draft}
  }

  const normalizedDraft = {...draft, coverDraftId: null, hasCoverFile: false}
  writeAlbumDraftData(normalizedDraft)
  await options.updateDraftReference(null)
  return {coverFile: null, draft: normalizedDraft}
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
        const restoredDraft = await restoreAlbumDraft({
          updateDraftReference: options.updateDraftReference,
        })
        isRestorationFinished = true

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
    }
    restore().catch((error: unknown) => {
      console.warn('Failed to finish the admin album draft restoration.', error)
    })
  })
}
