import {createSignal, Show} from 'solid-js'

interface SVideoPreviewProps {
  readonly src: string
  readonly label?: string
  readonly autoplay?: boolean
  readonly contain?: boolean
}

const FRAME_SECONDS = 0.1

export const SVideoPreview = (props: SVideoPreviewProps) => {
  const [video, setVideo] = createSignal<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = createSignal(false)
  const handleMetadata = (event: Event & {currentTarget: HTMLVideoElement}) => {
    const element = event.currentTarget
    const {duration} = element
    if (Number.isFinite(duration) && duration > 0) {
      // Seeking requests a decoded frame even when the thumbnail stays paused.
      element.currentTime = Math.min(FRAME_SECONDS, duration / 2)
    }
  }
  const handleToggle = () => {
    const element = video()
    if (element === null) {
      return
    }
    if (element.paused) {
      // A rejected playback request leaves the play control available for retry.
      return element.play().catch(() => setPlaying(false))
    }
    element.pause()
  }
  return (
    <div class="relative h-full w-full">
      <video
        ref={setVideo}
        src={props.src}
        aria-label={props.label}
        aria-hidden={props.label === undefined ? true : undefined}
        class="absolute inset-0 block h-full w-full"
        classList={{'object-contain': props.contain, 'object-cover': !props.contain}}
        muted
        prop:muted={true}
        playsinline
        preload="metadata"
        autoplay={props.autoplay}
        loop={props.autoplay}
        onLoadedMetadata={handleMetadata}
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <Show when={props.autoplay}>
        <button
          type="button"
          class="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-md
            border-0 bg-stone-900/75 p-0 text-white hover:bg-stone-900
            focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-blue-700"
          aria-label={playing() ? '미리보기 일시정지' : '미리보기 재생'}
          onClick={handleToggle}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4 fill-current">
            <path d={playing() ? 'M6 5h4v14H6zm8 0h4v14h-4z' : 'm8 5 11 7-11 7z'} />
          </svg>
        </button>
      </Show>
    </div>
  )
}
