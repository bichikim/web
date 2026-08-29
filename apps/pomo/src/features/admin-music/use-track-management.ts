import {createSignal, type JSX} from 'solid-js'

import {createTrackWithAudio, removeTrack} from './track-creation'
import {confirmTrackAudioRegistration, validateTrackAudio} from './track-upload'

interface UseTrackManagementProps {
  readonly refreshCatalog: () => Promise<void>
  readonly setMessage: (message: string | null) => void
}

export const useTrackManagement = (props: UseTrackManagementProps) => {
  const [isSavingTrack, setIsSavingTrack] = createSignal(false)
  const [confirmingAssetId, setConfirmingAssetId] = createSignal<string | null>(null)
  const [removingTrackId, setRemovingTrackId] = createSignal<string | null>(null)
  const [trackArtist, setTrackArtist] = createSignal('')
  const [trackResetVersion, setTrackResetVersion] = createSignal(0)
  const [trackTitle, setTrackTitle] = createSignal('')

  const handleTrackSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    const trackForm = event.currentTarget
    setIsSavingTrack(true)
    props.setMessage(null)
    const form = new FormData(trackForm)
    const audio = form.get('audio')

    try {
      if (!(audio instanceof File)) {
        throw new TypeError('MP3 파일을 선택해 주세요.')
      }

      validateTrackAudio(audio)
      const result = await createTrackWithAudio({
        albumId: String(form.get('albumId') ?? ''),
        artist: String(form.get('artist') ?? ''),
        audio,
        title: String(form.get('title') ?? ''),
      })

      if (!result.success) {
        const detail =
          result.error instanceof Error ? result.error.message : '곡을 저장하지 못했습니다.'
        await props.refreshCatalog().catch(() => undefined)

        switch (result.cleanupStatus) {
          case 'failed':
            props.setMessage(`${detail} 생성된 곡 정보를 정리하지 못했습니다. 다시 삭제해 주세요.`)
            break
          case 'preserved':
            props.setMessage(
              `${detail} 등록 결과가 확정되지 않아 곡은 삭제하지 않았습니다. 목록에서 상태를 확인해 주세요.`,
            )
            break
          case 'succeeded':
            props.setMessage(`${detail} 생성된 곡 정보는 정리했습니다.`)
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

      setTrackArtist('')
      setTrackTitle('')
      setTrackResetVersion((version) => version + 1)
      trackForm.reset()
      await props.refreshCatalog()
      props.setMessage('곡과 MP3를 앨범에 추가하고 활성화했습니다.')
    } catch (error) {
      const detail = error instanceof Error ? error.message : '곡을 저장하지 못했습니다.'
      props.setMessage(detail)
    } finally {
      setIsSavingTrack(false)
    }
  }

  const handleTrackRemove = async (trackId: string): Promise<void> => {
    setRemovingTrackId(trackId)
    props.setMessage(null)

    try {
      await removeTrack(trackId)
      await props.refreshCatalog()
      props.setMessage('수록곡과 MP3 파일을 삭제했습니다.')
    } catch (error) {
      props.setMessage(error instanceof Error ? error.message : '수록곡을 삭제하지 못했습니다.')
    } finally {
      setRemovingTrackId(null)
    }
  }

  const handleTrackConfirmation = async (assetId: string): Promise<void> => {
    setConfirmingAssetId(assetId)
    props.setMessage(null)

    try {
      const result = await confirmTrackAudioRegistration(assetId)
      await props.refreshCatalog()
      props.setMessage(
        result.status === 'active'
          ? 'MP3 등록을 확인하고 수록곡을 활성화했습니다.'
          : '등록 결과를 아직 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    } catch (error) {
      await props.refreshCatalog().catch(() => undefined)
      props.setMessage(error instanceof Error ? error.message : 'MP3 등록을 확인하지 못했습니다.')
    } finally {
      setConfirmingAssetId(null)
    }
  }

  return {
    confirmingAssetId,
    handleTrackConfirmation,
    handleTrackRemove,
    handleTrackSubmit,
    isSavingTrack,
    removingTrackId,
    setTrackArtist,
    setTrackTitle,
    trackArtist,
    trackResetVersion,
    trackTitle,
  }
}
