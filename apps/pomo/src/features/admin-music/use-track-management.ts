import {useAction, useSubmission, useSubmissions} from '@solidjs/router'
import {createSignal, type JSX} from 'solid-js'

import {confirmAdminTrackAction, createAdminTrackAction, removeAdminTrackAction} from './actions'

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
  const [trackArtist, setTrackArtist] = createSignal('')
  const [trackResetVersion, setTrackResetVersion] = createSignal(0)
  const [trackTitle, setTrackTitle] = createSignal('')

  const handleTrackSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    const trackForm = event.currentTarget
    props.setMessage(null)
    const form = new FormData(trackForm)
    const result = await createTrack(form)
    createTrackSubmission.clear()

    if (result.status === 'failed') {
      await props.refreshCatalog().catch(() => undefined)

      switch (result.cleanupStatus) {
        case 'failed':
          props.setMessage(
            `${result.detail} 생성된 곡 정보를 정리하지 못했습니다. 다시 삭제해 주세요.`,
          )
          break
        case 'preserved':
          props.setMessage(
            `${result.detail} 등록 결과가 확정되지 않아 곡은 삭제하지 않았습니다. 목록에서 상태를 확인해 주세요.`,
          )
          break
        case 'succeeded':
          props.setMessage(`${result.detail} 생성된 곡 정보는 정리했습니다.`)
          break
        // The result union cannot reach this exhaustive guard.
        /* v8 ignore next 4 */
        default: {
          const exhaustiveCleanupStatus: never = result.cleanupStatus
          return exhaustiveCleanupStatus
        }
      }
      return
    }

    if (result.status === 'created') {
      setTrackArtist('')
      setTrackTitle('')
      setTrackResetVersion((version) => version + 1)
      trackForm.reset()
      await props.refreshCatalog()
      props.setMessage('곡과 MP3를 앨범에 추가하고 활성화했습니다.')
      return
    }

    props.setMessage(result.detail)
  }

  const handleTrackRemove = async (trackId: string): Promise<void> => {
    props.setMessage(null)
    const result = await removeTrack(trackId)
    removeTrackSubmissions
      .filter((submission) => !submission.pending && submission.input[0] === trackId)
      .forEach((submission) => submission.clear())
    if (result.status === 'succeeded') {
      await props.refreshCatalog()
      props.setMessage('수록곡과 MP3 파일을 삭제했습니다.')
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
      await props.refreshCatalog()
      props.setMessage(
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
    confirmingAssetId: () =>
      confirmTrackSubmissions.findLast((submission) => submission.pending)?.input[0] ?? null,
    handleTrackConfirmation,
    handleTrackRemove,
    handleTrackSubmit,
    isConfirmingAsset: (assetId: string) =>
      confirmTrackSubmissions.some(
        (submission) => submission.pending && submission.input[0] === assetId,
      ),
    isRemovingTrack: (trackId: string) =>
      removeTrackSubmissions.some(
        (submission) => submission.pending && submission.input[0] === trackId,
      ),
    isSavingTrack: () => createTrackSubmission.pending === true,
    removingTrackId: () =>
      removeTrackSubmissions.findLast((submission) => submission.pending)?.input[0] ?? null,
    setTrackArtist,
    setTrackTitle,
    trackArtist,
    trackResetVersion,
    trackTitle,
  }
}
