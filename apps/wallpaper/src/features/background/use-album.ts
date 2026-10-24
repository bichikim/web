import {type Accessor, createEffect, createMemo, createSignal, onCleanup, untrack} from 'solid-js'
import {usePlayback} from '@winter-love/wallpaper/album/use-playback'
import {selectTransition} from '@winter-love/wallpaper/album/select-transition'
import {type BackgroundMedia, DEFAULT_BACKGROUND} from '@winter-love/wallpaper/model'
import type {FrameRenderer} from '@winter-love/wallpaper/frame-renderer'
import type {AlbumWallpaper} from '@winter-love/wallpaper/settings/model'

interface UseAlbumProps {
  readonly canvas: Accessor<HTMLCanvasElement | null>
  readonly content: Accessor<AlbumWallpaper>
  readonly items: Accessor<readonly BackgroundMedia[]>
  readonly load: (id: string) => Promise<Blob>
  readonly onError: (error: unknown) => void
}

export const useAlbum = (props: UseAlbumProps) => {
  const [failedIds, setFailedIds] = createSignal<readonly string[]>([])
  const [renderer, setRenderer] = createSignal<FrameRenderer | null>(null)
  const preferences = createMemo(() => {
    const content = props.content()
    return {
      ...DEFAULT_BACKGROUND,
      ...content,
      mode: 'frame' as const,
      randomTransitions: content.transition === 'random',
      transition: content.transition === 'random' ? ('fade' as const) : content.transition,
    }
  })
  const items = createMemo(() =>
    props.content().mediaIds.flatMap((id) => {
      const item = props.items().find((entry) => entry.id === id)
      return item === undefined ? [] : [item]
    }),
  )
  const playback = usePlayback({
    background: {
      failedIds,
      items,
      markFailed: (id) =>
        setFailedIds((previous) => (previous.includes(id) ? previous : [...previous, id])),
      preferences,
    },
  })
  const report = (cause: unknown) => {
    props.onError(cause)
    playback.onError()
  }
  createEffect(() => {
    const canvas = props.canvas()
    if (canvas === null) {
      return
    }
    let disposed = false
    let instance: FrameRenderer | null = null
    const initialize = async () => {
      const {FrameRenderer: Renderer} = await import('@winter-love/wallpaper/frame-renderer')
      if (disposed) {
        return
      }
      instance = new Renderer({
        canvas,
        onEnded: playback.onEnded,
        onError: () => report(new Error('Wallpaper media could not be decoded')),
        onVideoStart: playback.onVideoStart,
      })
      await instance.initialize()
      if (!disposed) {
        setRenderer(instance)
      }
    }
    initialize().catch((cause: unknown) => {
      if (!disposed) {
        props.onError(cause)
      }
    })
    onCleanup(() => {
      disposed = true
      setRenderer(null)
      instance?.destroy()
    })
  })
  createEffect(() => {
    const instance = renderer()
    const loop = props.content().videoMode === 'loop'
    instance?.setVideoLoop(loop)
  })
  createEffect(() => {
    const instance = renderer()
    const current = playback.current()
    playback.generation()
    if (instance === null) {
      return
    }
    if (current === null) {
      instance.clear()
      return
    }
    playback.onLoading()
    let disposed = false
    const show = async () => {
      const blob = await props.load(current.id)
      if (disposed || !(await instance.show(blob, current.kind, current.id)) || disposed) {
        return
      }
      const reducedMotion =
        globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      const effect = reducedMotion ? 'none' : untrack(() => selectTransition(preferences()))
      if ((await instance.present(effect)) && !disposed) {
        playback.onReady()
      }
    }
    show().catch((cause: unknown) => {
      if (!disposed) {
        report(cause)
      }
    })
    onCleanup(() => {
      disposed = true
      instance.cancelPending()
    })
  })
  return {current: playback.current}
}
