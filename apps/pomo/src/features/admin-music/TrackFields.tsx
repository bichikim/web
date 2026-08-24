import {cx} from 'class-variance-authority'
import {createEffect, createSignal, on} from 'solid-js'

import {readTrackMetadata} from './track-metadata'

const FIELD_CLASSES = cx(
  'h-11 w-full rounded-3 border border-white/15 bg-white/5 px-3 text-sm text-white outline-none',
  'placeholder:text-white/30 focus:border-#e8bc88/70',
  'disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/2 disabled:text-white/45',
)

interface TrackFieldsProps {
  readonly artist: string
  readonly onArtistChange: (artist: string) => void
  readonly onTitleChange: (title: string) => void
  readonly resetVersion: number
  readonly title: string
}

const TrackFields = (props: TrackFieldsProps) => {
  const [audioInput, setAudioInput] = createSignal<HTMLInputElement>()
  const [metadataMessage, setMetadataMessage] = createSignal<string | null>(null)
  const [useMetadata, setUseMetadata] = createSignal(true)
  let readVersion = 0

  createEffect(
    on(
      () => props.resetVersion,
      () => {
        readVersion += 1
        setMetadataMessage(null)
        setUseMetadata(true)
      },
      {defer: true},
    ),
  )

  const applyMetadata = async (file: File): Promise<void> => {
    readVersion += 1
    const currentVersion = readVersion
    setMetadataMessage('MP3 정보를 읽는 중…')

    try {
      const metadata = await readTrackMetadata(file)

      if (currentVersion !== readVersion || !useMetadata()) {
        return
      }

      if (metadata.title !== null) {
        props.onTitleChange(metadata.title)
      }

      if (metadata.artist !== null) {
        props.onArtistChange(metadata.artist)
      }

      setMetadataMessage(
        metadata.title === null && metadata.artist === null
          ? 'MP3에 제목과 아티스트 정보가 없습니다.'
          : 'MP3의 제목과 아티스트를 적용했습니다.',
      )
    } catch {
      if (currentVersion === readVersion) {
        setMetadataMessage('MP3 정보를 읽지 못했습니다. 직접 입력해 주세요.')
      }
    }
  }

  const handleAudioChange = async (
    event: Event & {currentTarget: HTMLInputElement},
  ): Promise<void> => {
    const file = event.currentTarget.files?.[0]

    if (file !== null && file !== undefined && useMetadata()) {
      await applyMetadata(file)
    }
  }

  const handleMetadataToggle = async (
    event: Event & {currentTarget: HTMLInputElement},
  ): Promise<void> => {
    const shouldUseMetadata = event.currentTarget.checked
    setUseMetadata(shouldUseMetadata)

    if (!shouldUseMetadata) {
      readVersion += 1
      setMetadataMessage(null)
      return
    }

    const file = audioInput()?.files?.[0]

    if (file !== null && file !== undefined) {
      await applyMetadata(file)
    }
  }

  return (
    <div class="grid gap-4">
      <label class="grid gap-2 text-sm">
        곡명
        <input
          class={FIELD_CLASSES}
          disabled={useMetadata()}
          maxlength="120"
          name="title"
          onInput={(event) => props.onTitleChange(event.currentTarget.value)}
          required
          value={props.title}
        />
      </label>
      <label class="grid gap-2 text-sm">
        아티스트
        <input
          class={FIELD_CLASSES}
          disabled={useMetadata()}
          maxlength="120"
          name="artist"
          onInput={(event) => props.onArtistChange(event.currentTarget.value)}
          required
          value={props.artist}
        />
      </label>
      <label class="grid gap-2 text-sm">
        MP3 파일
        <input
          accept="audio/mpeg,audio/mp3,.mp3"
          class={FIELD_CLASSES}
          name="audio"
          onChange={handleAudioChange}
          ref={setAudioInput}
          required
          type="file"
        />
        <span class="text-xs leading-5 text-white/45">
          최대 250MB · 비공개 R2에 직접 업로드한 뒤 서버에서 형식과 재생 시간을 확인합니다.
        </span>
      </label>
      <label class="flex items-center gap-2 text-sm text-white/70">
        <input checked={useMetadata()} onChange={handleMetadataToggle} type="checkbox" />
        MP3 정보로 제목·아티스트 채우기
      </label>
      <input name="title" type="hidden" value={props.title} />
      <input name="artist" type="hidden" value={props.artist} />
      <p aria-live="polite" class="m-0 min-h-5 text-xs text-white/45">
        {metadataMessage()}
      </p>
    </div>
  )
}

export default TrackFields
