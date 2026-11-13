import {type Accessor, batch, createEffect, createMemo, createSignal, on} from 'solid-js'
import {shuffleTrackOrder} from './playback-order'
import {useAudioPlayback} from './use-audio-playback'
import {useMusicLibrary} from './use-music-library'

interface UseMusicPlayerProps {
  readonly element: Accessor<HTMLAudioElement | null>
}

export const useMusicPlayer = (props: UseMusicPlayerProps) => {
  const library = useMusicLibrary()
  const [order, setOrder] = createSignal<readonly string[]>([])
  const [position, setPosition] = createSignal(0)
  const entries = createMemo(
    () =>
      library
        .library()
        ?.albums.flatMap((album) =>
          album.tracks.map((track) => ({album, id: JSON.stringify([album.id, track.id]), track})),
        ) ?? [],
  )
  const current = createMemo(
    () => entries().find((entry) => entry.id === order()[position()]) ?? null,
  )
  const album = () => current()?.album ?? library.library()?.albums[0] ?? null
  const track = () => current()?.track ?? null
  const playback = useAudioPlayback({element: props.element, source: () => track()?.src ?? null})
  const resetOrder = (previous?: string) => {
    const next = shuffleTrackOrder({ids: entries().map((entry) => entry.id), previous})
    batch(() => {
      setOrder(next)
      setPosition(0)
    })
  }
  createEffect(on(entries, () => resetOrder()))
  const advance = (options: {readonly resume: boolean}) => {
    const queue = order()
    if (queue.length === 0) {
      return
    }
    const index = position()
    if (index + 1 < queue.length) {
      setPosition(index + 1)
    } else {
      resetOrder(queue[index])
    }
    playback.seek(0)
    if (options.resume) {
      playback.play()
    }
  }
  const ended = () => {
    playback.pause()
    advance({resume: true})
  }
  return {
    ...playback,
    album,
    canNext: () => order().length > 0,
    ended,
    libraryStatus: library.status,
    next: () =>
      advance({resume: playback.status() === 'playing' || playback.status() === 'loading'}),
    toggle: () => (library.status() === 'error' ? library.retry() : playback.toggle()),
    track,
  }
}
