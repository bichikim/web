import {createSignal} from 'solid-js'
import type {TransitionEffect} from '@winter-love/wallpaper/model'
import {useDesktopAlbum} from '../features/desktop-preview'

interface SDesktopAlbumProps {
  /** Music cover URL; defaults to the first album cover. */
  readonly source?: string
  /** Actual desktop transition; defaults to directional wipe. */
  readonly effect?: TransitionEffect
  /** Notifies the album clock after the transition has completed. */
  readonly onPresented?: () => void
  /** Retains the image fallback when the browser cannot render the effect. */
  readonly onError?: () => void
}

export default function SDesktopAlbum(props: SDesktopAlbumProps) {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const handleError = (cause: unknown) => {
    console.error('Desktop album preview failed', cause)
    props.onError?.()
  }
  const album = useDesktopAlbum({
    canvas,
    effect: () => props.effect ?? 'directional-wipe',
    onError: handleError,
    onPresented: () => props.onPresented?.(),
    source: () => props.source ?? '/music/ash-afternoon/window/cover.webp',
  })
  return (
    <canvas
      ref={setCanvas}
      aria-label="실제 Wallpaper 앱 배경 전환"
      class="absolute inset-0 h-full w-full opacity-0"
      classList={{'opacity-100': album.ready()}}
    />
  )
}
