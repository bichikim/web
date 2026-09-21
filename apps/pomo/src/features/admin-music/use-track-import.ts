import {getExceptionMessage} from '../error-detail'
import {createSignal, onCleanup} from 'solid-js'
import {createStore} from 'solid-js/store'
import type {CreateTrackActionResult} from './actions'
import {validateTrackAudio} from './track-upload'
import type {TrackImportSummary} from './types'

const MAXIMUM_FIELD_LENGTH = 120

interface TrackImportEntry {
  readonly id: number
  readonly audio: File
  readonly title: string
  readonly artist: string
  readonly reading: boolean
  readonly status: 'editing' | 'created' | 'failed' | 'preserved'
  readonly detail: string
}

interface UseTrackImportProps {
  readonly albumId: () => string
  readonly createTrack: (form: FormData) => Promise<CreateTrackActionResult>
}

export const useTrackImport = (props: UseTrackImportProps) => {
  const [tracks, setTracks] = createStore<TrackImportEntry[]>([])
  const [isSaving, setIsSaving] = createSignal(false)
  const [message, setMessage] = createSignal<string | null>(null)
  let nextId = 0
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  const pendingTracks = () =>
    tracks.filter((track) => track.status === 'editing' || track.status === 'failed')
  const isReading = () => tracks.some((track) => track.reading)

  const addFiles = (files: ReadonlyArray<File>): void => {
    if (isSaving()) {
      return
    }
    const errors: string[] = []
    for (const audio of files) {
      try {
        validateTrackAudio(audio)
        const duplicate = tracks.some((track) => track.audio === audio)
        if (!duplicate) {
          nextId += 1
          setTracks(tracks.length, {
            artist: '',
            audio,
            detail: '',
            id: nextId,
            reading: false,
            status: 'editing',
            title: '',
          })
        }
      } catch (error) {
        errors.push(`${audio.name}: ${getExceptionMessage(error, '파일을 추가하지 못했습니다.')}`)
      }
    }
    setMessage(errors.length > 0 ? errors.join('\n') : null)
  }

  const updateTrack = (id: number, field: 'title' | 'artist', value: string): void => {
    if (!isSaving()) {
      setTracks((track) => track.id === id, {[field]: value})
    }
  }
  const setReading = (id: number, reading: boolean): void => {
    setTracks((track) => track.id === id, {reading})
  }
  const removeTrack = (id: number): void => {
    if (!isSaving()) {
      setTracks((current) => current.filter((track) => track.id !== id))
    }
  }

  const saveTrack = async (
    track: TrackImportEntry,
    albumId: string,
  ): Promise<keyof TrackImportSummary> => {
    const form = new FormData()
    form.set('albumId', albumId)
    form.set('audio', track.audio)
    form.set('title', track.title.trim())
    form.set('artist', track.artist.trim())
    try {
      const result = await props.createTrack(form)
      const status =
        result.status === 'created'
          ? 'created'
          : result.status === 'failed' && result.cleanupStatus !== 'succeeded'
            ? 'preserved'
            : 'failed'
      const detail =
        result.status === 'created'
          ? '등록 완료'
          : result.status === 'failed' && result.cleanupStatus !== 'succeeded'
            ? `${result.detail} ${
                result.cleanupStatus === 'failed'
                  ? '생성된 곡 정보를 정리하지 못했습니다. 다시 삭제해 주세요.'
                  : '목록에서 등록 상태를 확인해 주세요.'
              }`
            : result.status === 'failed'
              ? `${result.detail} 생성된 곡 정보는 정리했습니다.`
              : result.detail
      setTracks((entry) => entry.id === track.id, {detail, status})
      return status
    } catch {
      // A lost action response cannot establish whether the remote mutation completed.
      setTracks((entry) => entry.id === track.id, {
        detail: '등록 결과를 확인하지 못했습니다. 목록에서 상태를 확인해 주세요.',
        status: 'preserved',
      })
      return 'preserved'
    }
  }

  const submit = async (): Promise<TrackImportSummary | undefined> => {
    if (isSaving() || isReading()) {
      return
    }
    const pending = pendingTracks()
    if (pending.length === 0) {
      return
    }
    if (
      pending.some(
        (track) =>
          track.title.trim().length === 0 ||
          track.artist.trim().length === 0 ||
          track.title.trim().length > MAXIMUM_FIELD_LENGTH ||
          track.artist.trim().length > MAXIMUM_FIELD_LENGTH,
      )
    ) {
      setMessage('모든 곡의 제목과 아티스트를 1~120자로 입력해 주세요.')
      return
    }
    const albumId = props.albumId()
    setMessage(null)
    setIsSaving(true)
    const summary = {created: 0, failed: 0, preserved: 0}
    try {
      for (const track of pending) {
        if (!disposed) {
          // oxlint-disable-next-line eslint/no-await-in-loop -- Finish the current file before starting another upload.
          const status = await saveTrack(track, albumId)
          summary[status] += 1
        }
      }
      return summary
    } finally {
      setIsSaving(false)
    }
  }

  return {
    addFiles,
    isReading,
    isSaving,
    message,
    pendingCount: () => pendingTracks().length,
    removeTrack,
    setReading,
    submit,
    tracks,
    updateTrack,
  }
}
