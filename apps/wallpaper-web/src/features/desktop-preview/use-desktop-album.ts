import {type Accessor, createEffect, createSignal} from 'solid-js'
import type {TransitionEffect} from '@winter-love/wallpaper/model'
import {type AlbumPreview, createAlbumPreview} from './create-album-preview'

interface UseDesktopAlbumProps {
  /** Canvas owned by the preview component. */
  readonly canvas: Accessor<HTMLCanvasElement | null>
  /** Current music cover URL. */
  readonly source: Accessor<string>
  /** Desktop app effect used for the next presentation. */
  readonly effect: Accessor<TransitionEffect>
  /** Called after decoding and the complete transition, when the display deadline can start. */
  readonly onPresented: () => void
  /** Reports a rendering failure so the containing preview can retain its image fallback. */
  readonly onError: (cause: unknown) => void
}

export const useDesktopAlbum = (props: UseDesktopAlbumProps) => {
  const [renderer, setRenderer] = createSignal<AlbumPreview | null>(null)
  const [ready, setReady] = createSignal(false)
  createEffect(
    () => props.canvas(),
    (canvas) => {
      if (canvas === null) {
        return
      }
      let disposed = false
      let owned: AlbumPreview | null = null
      createAlbumPreview(canvas)
        .then((instance) => {
          if (disposed) {
            instance.destroy()
          } else {
            owned = instance
            setRenderer(instance)
          }
        })
        .catch((cause: unknown) => {
          if (!disposed) {
            props.onError(cause)
          }
        })
      return () => {
        disposed = true
        setRenderer(null)
        setReady(false)
        owned?.destroy()
      }
    },
  )
  createEffect(
    () => ({effect: props.effect(), instance: renderer(), source: props.source()}),
    ({instance, source, effect}) => {
      if (instance === null) {
        return
      }
      let disposed = false
      instance
        .show(source, effect)
        .then((completed) => {
          if (completed && !disposed) {
            setReady(true)
            props.onPresented()
          }
        })
        .catch((cause: unknown) => {
          if (!disposed) {
            setReady(false)
            props.onError(cause)
          }
        })
      return () => {
        disposed = true
        instance.cancelPending()
      }
    },
  )
  return {ready}
}
