import {createEffect, createMemo, createSignal, onCleanup, onMount, Show, untrack} from 'solid-js'
import * as m from '@paraglide/message'
import {
  type BackgroundController,
  type PhotoSize,
  selectTransition,
  showFrame,
  usePlayback,
} from 'src/features/background'
import {FrameRenderer} from 'src/features/frame-renderer'
import {reportClientError} from 'src/features/client-error-reporter'

export interface CanvasProps {
  readonly background: BackgroundController
}
export const Canvas = (props: CanvasProps) => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const [ready, setReady] = createSignal(false)
  const [failed, setFailed] = createSignal(false)
  const playback = usePlayback({
    get background() {
      return props.background
    },
  })
  let renderer: FrameRenderer | null = null
  const sizes = new Map<string, PhotoSize>()
  const pairPhotos = createMemo(() => props.background.preferences().pairPhotos)
  const [companionId, setCompanionId] = createSignal<string | null>(null)
  onMount(() => {
    const element = canvas()
    if (element === null) {
      return
    }
    renderer = new FrameRenderer({
      canvas: element,
      onEnded: playback.onEnded,
      onError: playback.onError,
      onVideoStart: playback.onVideoStart,
    })
    let disposed = false
    renderer
      .initialize()
      .then(() => {
        if (!disposed) {
          setReady(true)
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setFailed(true)
        }
        reportClientError(error, {feature: 'background-renderer', source: 'direct'})
      })
    onCleanup(() => {
      disposed = true
      renderer?.destroy()
    })
  })
  createEffect(() => {
    const loop = props.background.preferences().videoMode === 'loop'
    if (ready()) {
      renderer?.setVideoLoop(loop)
    }
  })
  createEffect(() => {
    const item = playback.current()
    playback.generation()
    const paired = pairPhotos()
    if (!ready() || renderer === null) {
      return
    }
    const currentRenderer = renderer
    if (item === null) {
      currentRenderer.clear()
      return
    }
    let disposed = false
    const controller = new AbortController()
    setCompanionId(null)
    playback.onLoading()
    showFrame({
      background: untrack(() => props.background),
      candidates: playback.candidates,
      item,
      pairPhotos: paired,
      renderer: currentRenderer,
      signal: controller.signal,
      sizes,
      transition: untrack(() => selectTransition(props.background.preferences())),
    })
      .then((shown) => {
        if (!disposed && shown !== null) {
          setCompanionId(shown.companionId)
          if (shown.companionId !== null) {
            playback.consume(shown.companionId)
          }
          playback.onReady()
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          reportClientError(error, {feature: 'background-playback', source: 'direct'})
          playback.onError()
        }
      })
    onCleanup(() => {
      disposed = true
      controller.abort()
      currentRenderer.cancelPending()
    })
  })
  createEffect(() => {
    const id = companionId()
    const items = props.background.items()
    if (id !== null && !items.some((item) => item.id === id)) {
      renderer?.removePhoto()
      setCompanionId(null)
    }
  })
  return (
    <figure class="relative m-0 h-full w-full bg-background" aria-label={m.background_frame()}>
      <canvas
        ref={setCanvas}
        class="block h-full w-full"
        aria-label={
          [
            playback.current()?.name,
            props.background.items().find((item) => item.id === companionId())?.name,
          ]
            .filter(Boolean)
            .join(' / ') || m.background_frame()
        }
      />
      <Show when={failed() || playback.current() === null}>
        <div class="absolute inset-0 grid place-content-center gap-4 px-6 text-center text-foreground">
          <p class="m-0" role="status">
            {failed() || props.background.items().length > 0
              ? m.background_playback_error()
              : m.background_empty()}
          </p>
          <Show when={!failed() && props.background.items().length > 0}>
            <button
              class={
                'cursor-pointer rounded-control border border-solid border-border bg-surface-overlay ' +
                'px-4 py-2 text-foreground focus-visible:shadow-focus'
              }
              type="button"
              onClick={() => {
                props.background.retry()
              }}
            >
              {m.background_retry()}
            </button>
          </Show>
        </div>
      </Show>
    </figure>
  )
}
