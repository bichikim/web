import {cx} from 'class-variance-authority'
import {createSignal} from 'solid-js'

import {useTrackFields} from '../../features/admin-music'

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
  const fields = useTrackFields(props)

  return (
    <div class="grid gap-4">
      <label class="grid gap-2 text-sm">
        곡명
        <input
          class={FIELD_CLASSES}
          disabled={fields.useMetadata()}
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
          disabled={fields.useMetadata()}
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
          onChange={(event) => fields.onAudioFileChange(event.currentTarget.files?.[0])}
          ref={setAudioInput}
          required
          type="file"
        />
        <span class="text-xs leading-5 text-white/45">
          최대 250MB · 비공개 R2에 직접 업로드한 뒤 서버에서 형식과 재생 시간을 확인합니다.
        </span>
      </label>
      <label class="flex items-center gap-2 text-sm text-white/70">
        <input
          checked={fields.useMetadata()}
          onChange={(event) =>
            fields.onMetadataToggle(event.currentTarget.checked, audioInput()?.files?.[0])
          }
          type="checkbox"
        />
        MP3 정보로 제목·아티스트 채우기
      </label>
      <input name="title" type="hidden" value={props.title} />
      <input name="artist" type="hidden" value={props.artist} />
      <p aria-live="polite" class="m-0 min-h-5 text-xs text-white/45">
        {fields.metadataMessage()}
      </p>
    </div>
  )
}

export default TrackFields
