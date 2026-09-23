import {For, type JSX} from 'solid-js'
import {
  type CreateTrackActionResult,
  type TrackImportTask,
  useTrackImport,
} from 'src/features/admin-music'
import {BUTTON_CLASSES, SECONDARY_BUTTON_CLASSES} from '../button-classes'
import {TrackFields} from '../TrackFields'

interface TrackFormProps {
  readonly albumId: string
  readonly albumTitle: string
  readonly isImporting: () => boolean
  readonly submitTrack: (form: FormData) => Promise<CreateTrackActionResult>
  readonly runTrackImport: (task: TrackImportTask) => Promise<void>
  readonly onCancel: () => void
}

export const TrackForm = (props: TrackFormProps) => {
  const importer = useTrackImport({
    albumId: () => props.albumId,
    createTrack: (form) => props.submitTrack(form),
  })
  const isBusy = () => props.isImporting() || importer.isSaving()
  const handleFiles: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    if (!isBusy()) {
      importer.addFiles(Array.from(event.currentTarget.files ?? []))
    }
    event.currentTarget.value = ''
  }
  const handleDrop: JSX.EventHandler<HTMLDivElement, DragEvent> = (event) => {
    event.preventDefault()
    if (!isBusy()) {
      importer.addFiles(Array.from(event.dataTransfer?.files ?? []))
    }
  }
  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    if (!isBusy()) {
      await props.runTrackImport(importer.submit)
    }
  }
  return (
    <form
      aria-label="곡 추가"
      class="rounded-4 border border-#e8bc88/25 bg-#e8bc88/5 p-5 sm:p-6"
      onSubmit={handleSubmit}
    >
      <h3 class="m-0 text-base font-800">새 곡 추가</h3>
      <p class="mb-0 mt-2 text-xs leading-5 text-white/70">
        여러 MP3를 선택하거나 끌어다 놓으세요. 파일마다 ‘{props.albumTitle}’의 수록곡 하나로
        등록됩니다.
      </p>
      <p class="mb-0 mt-2 text-xs leading-5 text-white/70">
        MP3 내장 이미지(JPG·PNG·WebP, 4MB 이하)는 곡별로 자동 등록됩니다. 제목·아티스트 자동
        채우기를 꺼도 이미지는 등록됩니다.
      </p>
      <div
        aria-label="파일 드롭 영역"
        class="mt-5 rounded-3 border border-dashed border-white/30 p-5"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        role="group"
      >
        <label class="grid gap-2 text-sm">
          MP3 파일 여러 개 선택
          <input
            accept="audio/mpeg,audio/mp3,.mp3"
            disabled={isBusy()}
            multiple
            onChange={handleFiles}
            type="file"
          />
          <span class="text-xs text-white/70">
            파일당 최대 250MB · 이 영역에 여러 파일을 놓아도 됩니다.
          </span>
        </label>
      </div>
      <div class="mt-5 grid gap-5">
        <For each={importer.tracks}>
          {(track) => (
            <fieldset
              class="m-0 min-w-0 rounded-3 border border-white/15 p-4"
              disabled={isBusy() || track.status === 'created'}
            >
              <legend class="max-w-full break-all px-2 text-sm font-700">{track.audio.name}</legend>
              <TrackFields
                artist={track.artist}
                audioFile={track.audio}
                disabled={track.status === 'preserved'}
                onArtistChange={(value) => importer.updateTrack(track.id, 'artist', value)}
                onMetadataPendingChange={(reading) => importer.setReading(track.id, reading)}
                onTitleChange={(value) => importer.updateTrack(track.id, 'title', value)}
                resetVersion={0}
                title={track.title}
              />
              <p aria-live="polite" class="text-sm text-white/80">
                {track.detail}
              </p>
              <button
                aria-label={`${track.audio.name} 목록에서 제외`}
                class={SECONDARY_BUTTON_CLASSES}
                onClick={() => importer.removeTrack(track.id)}
                type="button"
              >
                목록에서 제외
              </button>
            </fieldset>
          )}
        </For>
      </div>
      <p aria-live="polite" class="whitespace-pre-line text-sm text-white/80">
        {importer.message()}
      </p>
      <div class="mt-5 flex flex-wrap justify-end gap-2">
        <button
          class={SECONDARY_BUTTON_CLASSES}
          disabled={isBusy()}
          onClick={() => props.onCancel()}
          type="button"
        >
          닫기
        </button>
        <button
          class={BUTTON_CLASSES}
          disabled={isBusy() || importer.isReading() || importer.pendingCount() === 0}
          type="submit"
        >
          {isBusy() ? '곡 저장·MP3 검증 중…' : `${importer.pendingCount()}곡 추가`}
        </button>
      </div>
    </form>
  )
}
