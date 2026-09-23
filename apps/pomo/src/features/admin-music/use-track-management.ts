import {useAction, useSubmission, useSubmissions} from '@solidjs/router'
import {createSignal} from 'solid-js'
import type {TrackImportSummary} from './types'

import {
  confirmAdminTrackAction,
  createAdminTrackAction,
  type CreateTrackActionResult,
  removeAdminTrackAction,
} from './actions'

interface UseTrackManagementProps {
  readonly refreshCatalog: () => Promise<void>
  readonly setMessage: (message: string | null) => void
}

export const useTrackManagement = (props: UseTrackManagementProps) => {
  const createTrack = useAction(createAdminTrackAction)
  const createTrackSubmission = useSubmission(createAdminTrackAction)
  const removeTrack = useAction(removeAdminTrackAction)
  const removeTrackSubmissions = useSubmissions(removeAdminTrackAction)
  const confirmTrack = useAction(confirmAdminTrackAction)
  const confirmTrackSubmissions = useSubmissions(confirmAdminTrackAction)
  const [catalogRefreshMessage, setCatalogRefreshMessage] = createSignal<string | null>(null)
  const [isRefreshingCatalog, setIsRefreshingCatalog] = createSignal(false)
  let catalogRevision = 0

  const refreshTrackCatalog = async (message: string): Promise<void> => {
    catalogRevision += 1
    const revision = catalogRevision
    setCatalogRefreshMessage(null)
    props.setMessage(message)
    try {
      await props.refreshCatalog()
      if (revision === catalogRevision) {
        setCatalogRefreshMessage(null)
        props.setMessage(message)
      }
    } catch {
      if (revision === catalogRevision) {
        setCatalogRefreshMessage(`${message} 목록을 새로고침하지 못했습니다.`)
      }
    }
  }

  const handleCatalogRetry = async (): Promise<void> => {
    if (isRefreshingCatalog() || catalogRefreshMessage() === null) {
      return
    }

    catalogRevision += 1
    const revision = catalogRevision
    setIsRefreshingCatalog(true)
    try {
      await props.refreshCatalog()
      if (revision === catalogRevision) {
        setCatalogRefreshMessage(null)
        props.setMessage('목록을 새로고침했습니다.')
      }
    } catch {
      // Preserve the completed mutation notice while another catalog retry is needed.
    } finally {
      setIsRefreshingCatalog(false)
    }
  }

  const submitTrack = async (form: FormData): Promise<CreateTrackActionResult> => {
    try {
      return await createTrack(form)
    } finally {
      createTrackSubmission.clear()
    }
  }

  const completeTrackImport = (summary: TrackImportSummary): Promise<void> =>
    refreshTrackCatalog(
      `등록 완료 ${summary.created}곡 · 등록 실패 ${summary.failed}곡 · 상태 확인 필요 ${summary.preserved}곡`,
    )

  const handleTrackRemove = async (trackId: string): Promise<void> => {
    props.setMessage(null)
    const result = await removeTrack(trackId)
    removeTrackSubmissions
      .filter((submission) => !submission.pending && submission.input[0] === trackId)
      .forEach((submission) => submission.clear())
    if (result.status === 'succeeded') {
      await refreshTrackCatalog('수록곡과 MP3 파일을 삭제했습니다.')
      return
    }

    props.setMessage(result.detail)
  }

  const handleTrackConfirmation = async (assetId: string): Promise<void> => {
    props.setMessage(null)
    const result = await confirmTrack(assetId)
    confirmTrackSubmissions
      .filter((submission) => !submission.pending && submission.input[0] === assetId)
      .forEach((submission) => submission.clear())
    if (result.status !== 'rejected') {
      await refreshTrackCatalog(
        result.status === 'active'
          ? 'MP3 등록을 확인하고 수록곡을 활성화했습니다.'
          : '등록 결과를 아직 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
      return
    }

    await props.refreshCatalog().catch(() => undefined)
    props.setMessage(result.detail)
  }

  return {
    catalogRefreshMessage,
    completeTrackImport,
    confirmingAssetId: () =>
      confirmTrackSubmissions.findLast((submission) => submission.pending)?.input[0] ?? null,
    handleCatalogRetry,
    handleTrackConfirmation,
    handleTrackRemove,
    isConfirmingAsset: (assetId: string) =>
      confirmTrackSubmissions.some(
        (submission) => submission.pending && submission.input[0] === assetId,
      ),
    isRefreshingCatalog,
    isRemovingTrack: (trackId: string) =>
      removeTrackSubmissions.some(
        (submission) => submission.pending && submission.input[0] === trackId,
      ),
    removingTrackId: () =>
      removeTrackSubmissions.findLast((submission) => submission.pending)?.input[0] ?? null,
    submitTrack,
  }
}
