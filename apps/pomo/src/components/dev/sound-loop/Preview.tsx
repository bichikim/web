import {createSignal, Show} from 'solid-js'

const BOUNDARY_SECONDS = 3

interface PreviewProps {
  readonly label: string
  readonly url: string
}
export function Preview(props: PreviewProps) {
  const [audio, setAudio] = createSignal<HTMLAudioElement | undefined>()
  const [repeat, setRepeat] = createSignal(true)
  const [ready, setReady] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const handleBoundaryClick = async () => {
    const element = audio()
    if (element === undefined || !Number.isFinite(element.duration)) {
      return
    }
    setError(null)
    element.currentTime = Math.max(0, element.duration - BOUNDARY_SECONDS)
    try {
      await element.play()
    } catch {
      setError('재생 버튼을 눌러 다시 시도해 주세요.')
    }
  }
  const handleMetadataLoaded = () => {
    setReady(true)
    setError(null)
  }
  const handleAudioError = () => {
    setReady(false)
    setError('이 파일을 재생할 수 없습니다.')
  }
  return (
    <section class="grid gap-3 rounded-xl border border-white/15 p-4">
      <h2 class="m-0 text-lg">{props.label}</h2>
      <audio
        ref={setAudio}
        aria-label={`${props.label} 재생`}
        class="w-full"
        controls
        loop={repeat()}
        src={props.url}
        onLoadedMetadata={handleMetadataLoaded}
        onEmptied={() => setReady(false)}
        onError={handleAudioError}
      />
      <div class="flex flex-wrap items-center gap-4">
        <label class="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={repeat()}
            onChange={(event) => setRepeat(event.currentTarget.checked)}
          />
          반복 재생
        </label>
        <button
          type="button"
          disabled={!ready()}
          onClick={handleBoundaryClick}
          class="min-h-11 rounded-xl border border-white/20 bg-transparent px-4 disabled:opacity-50"
        >
          끝 3초부터 듣기
        </button>
      </div>
      <Show when={error()}>
        {(message) => (
          <p role="alert" class="m-0 text-sm text-#ffc0ce">
            {message()}
          </p>
        )}
      </Show>
    </section>
  )
}
