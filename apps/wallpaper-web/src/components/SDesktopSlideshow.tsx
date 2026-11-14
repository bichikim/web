import {clientOnly} from '@solidjs/start'
import {batch, createMemo, createSignal, Show} from 'solid-js'
import covers from '../../public/music/ash-afternoon/covers.json'

const SDesktopAlbum = clientOnly(() => import('./SDesktopAlbum'), {lazy: true})
const EFFECTS = ['directional-wipe', 'cross-warp', 'circle-open', 'rgb-kinetic', 'fade'] as const

interface SDesktopSlideshowProps {
  /** Suspend the display clock while hidden or masked; omitted advances covers normally. */
  readonly playing?: boolean
}

export const SDesktopSlideshow = (props: SDesktopSlideshowProps) => {
  const [image, setImage] = createSignal(0)
  const [prepared, setPrepared] = createSignal(false)
  const [presented, setPresented] = createSignal(false)
  const cover = createMemo(() => covers.tracks[image()]!)
  const nextCover = createMemo(() => covers.tracks[(image() + 1) % covers.tracks.length]!)
  const effect = createMemo(() => EFFECTS[(image() + EFFECTS.length - 1) % EFFECTS.length]!)
  const handlePrepared = () => setPrepared(true)
  const handlePresented = () => setPresented(true)
  const handleNext = () => {
    if (props.playing !== false && prepared() && presented()) {
      batch(() => {
        setPrepared(false)
        setPresented(false)
        setImage((current) => (current + 1) % covers.tracks.length)
      })
    }
  }
  return (
    <>
      <Show when={cover()} keyed>
        {(current) => (
          <>
            <img
              src={nextCover().artwork}
              alt=""
              aria-hidden="true"
              onLoad={handlePrepared}
              decoding="async"
              class="absolute inset-0 h-full w-full object-cover object-top"
            />
            <img
              src={current.artwork}
              alt="노트북 앨범 배경"
              onAnimationEnd={handleNext}
              decoding="async"
              class="absolute inset-0 h-full w-full object-cover object-top [animation-timing-function:linear]"
              classList={{
                '[animation-play-state:paused]!': props.playing === false,
                'animate-desktop-wallpaper': prepared() && presented(),
              }}
            />
          </>
        )}
      </Show>
      <SDesktopAlbum
        source={cover().artwork}
        effect={effect()}
        onPresented={handlePresented}
        onError={handlePresented}
      />
    </>
  )
}
