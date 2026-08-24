import {createSignal, type JSX} from 'solid-js'
import {z} from 'zod'

import {uploadTrackAudio, validateTrackAudio} from './track-upload'

const createdTrackSchema = z.object({id: z.string().uuid()})

interface UseTrackManagementProps {
  readonly refreshCatalog: () => Promise<void>
  readonly setMessage: (message: string | null) => void
}

const createTrack = async (body: Readonly<Record<string, unknown>>): Promise<string> => {
  const response = await fetch('/api/admin/music/tracks', {
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('곡 정보를 저장하지 못했습니다.')
  }

  return createdTrackSchema.parse(await response.json()).id
}

const deleteTrack = async (trackId: string): Promise<void> => {
  const response = await fetch(`/api/admin/music/tracks/${encodeURIComponent(trackId)}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('수록곡을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

export const useTrackManagement = (props: UseTrackManagementProps) => {
  const [isSavingTrack, setIsSavingTrack] = createSignal(false)
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
    let didCreateTrack = false

    try {
      if (!(audio instanceof File)) {
        throw new TypeError('MP3 파일을 선택해 주세요.')
      }

      validateTrackAudio(audio)
      const trackId = await createTrack({
        albumId: String(form.get('albumId') ?? ''),
        artist: String(form.get('artist') ?? ''),
        title: String(form.get('title') ?? ''),
      })
      didCreateTrack = true
      await uploadTrackAudio(trackId, audio)
      setTrackArtist('')
      setTrackTitle('')
      setTrackResetVersion((version) => version + 1)
      trackForm.reset()
      await props.refreshCatalog()
      props.setMessage('곡과 MP3를 앨범에 추가하고 활성화했습니다.')
    } catch (error) {
      if (didCreateTrack) {
        await props.refreshCatalog().catch(() => undefined)
      }

      const detail = error instanceof Error ? error.message : '곡을 저장하지 못했습니다.'
      props.setMessage(didCreateTrack ? `곡 정보는 저장했습니다. ${detail}` : detail)
    } finally {
      setIsSavingTrack(false)
    }
  }

  const handleTrackRemove = async (trackId: string): Promise<void> => {
    setRemovingTrackId(trackId)
    props.setMessage(null)

    try {
      await deleteTrack(trackId)
      await props.refreshCatalog()
      props.setMessage('수록곡과 MP3 파일을 삭제했습니다.')
    } catch (error) {
      props.setMessage(error instanceof Error ? error.message : '수록곡을 삭제하지 못했습니다.')
    } finally {
      setRemovingTrackId(null)
    }
  }

  return {
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
