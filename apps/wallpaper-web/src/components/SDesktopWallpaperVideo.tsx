import {createEffect, createSignal, onCleanup} from 'solid-js'

interface SDesktopWallpaperVideoProps {
  /** Pause during scene transitions; omitted plays the wallpaper while visible. */
  readonly playing?: boolean
}

export const SDesktopWallpaperVideo = (props: SDesktopWallpaperVideoProps) => {
  const [element, setElement] = createSignal<HTMLVideoElement | null>(null)
  createEffect(() => {
    const video = element()
    if (video === null) {
      return
    }
    const owner = video.ownerDocument
    const preference = owner.defaultView?.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePlayback = () => {
      if (props.playing === false || owner.hidden || preference?.matches) {
        video.pause()
      } else {
        video.play().catch(() => undefined)
      }
    }
    updatePlayback()
    owner.addEventListener('visibilitychange', updatePlayback)
    preference?.addEventListener('change', updatePlayback)
    onCleanup(() => {
      owner.removeEventListener('visibilitychange', updatePlayback)
      preference?.removeEventListener('change', updatePlayback)
      video.pause()
    })
  })
  return (
    <video
      ref={setElement}
      aria-label="창가 라이브 배경"
      src="/wallpapers/window/loop.mp4"
      poster="/wallpapers/window/poster.jpg"
      loop
      muted
      prop:muted={true}
      playsinline
      preload="auto"
      class="absolute inset-0 h-full w-full object-cover object-top"
    />
  )
}
