import {batch, createEffect, createMemo, createSignal, onCleanup, untrack} from 'solid-js'
import type {BackgroundController} from './use-background'
import {nextSlide, type Slide} from './playlist'

const MILLISECONDS_PER_SECOND = 1000

export interface UsePlaybackProps {
  readonly background: BackgroundController
}

/** Advances each slide according to its display deadline and video completion policy. */
export const usePlayback = (props: UsePlaybackProps) => {
  const [slide, setSlide] = createSignal<Slide>({current: null, remaining: []})
  const [generation, setGeneration] = createSignal(0)
  const [isLoaded, setIsLoaded] = createSignal(false)
  const [ended, setEnded] = createSignal(false)
  const [startedAt, setStartedAt] = createSignal<number | null>(null)
  const eligibleIds = createMemo(() => {
    const failed = props.background.failedIds()
    return props.background
      .items()
      .filter((item) => !failed.includes(item.id))
      .map((item) => item.id)
  })
  const current = createMemo(
    () => props.background.items().find((item) => item.id === slide().current) ?? null,
    null,
    {equals: (previous, next) => previous?.id === next?.id},
  )
  const advance = () => {
    setIsLoaded(false)
    setSlide((previous) =>
      nextSlide({...previous, ids: eligibleIds(), mode: props.background.preferences().order}),
    )
    setGeneration((value) => value + 1)
  }
  createEffect(() => {
    const ids = eligibleIds()
    props.background.preferences().order
    untrack(() => {
      const previous = slide()
      if (previous.current === null || !ids.includes(previous.current)) {
        advance()
      } else {
        const remaining = previous.remaining.filter((id) => ids.includes(id))
        const additions = ids.filter(
          (id) =>
            id !== previous.current && !previous.seen?.includes(id) && !remaining.includes(id),
        )
        setSlide({...previous, remaining: [...remaining, ...additions]})
      }
    })
  })
  createEffect(() => {
    if (props.background.preferences().videoMode === 'loop') {
      setEnded(false)
    }
  })
  createEffect(() => {
    const item = current()
    const {photoSeconds, videoMode} = props.background.preferences()
    const finished = ended()
    const started = startedAt()
    if (!isLoaded() || item === null || started === null) {
      return
    }
    if (item.kind === 'video') {
      if (videoMode === 'end') {
        if (finished) {
          untrack(advance)
        }
        return
      }
      if (videoMode === 'hold' && !finished) {
        return
      }
    }
    const remaining = photoSeconds * MILLISECONDS_PER_SECOND - (Date.now() - started)
    if (remaining <= 0) {
      untrack(advance)
      return
    }
    const timer = setTimeout(advance, remaining)
    onCleanup(() => clearTimeout(timer))
  })
  return {
    candidates: () => slide().remaining,
    consume: (id: string) =>
      setSlide((previous) => ({
        ...previous,
        remaining: previous.remaining.filter((candidate) => candidate !== id),
        seen: [...(previous.seen ?? []), id],
      })),
    current,
    generation,
    onEnded: () => setEnded(true),
    onError: () => {
      const item = current()
      if (item !== null) {
        props.background.markFailed(item.id)
      }
    },
    onLoading: () =>
      batch(() => {
        setIsLoaded(false)
        setEnded(false)
        setStartedAt(null)
      }),
    onReady: () =>
      batch(() => {
        if (startedAt() === null) {
          setStartedAt(Date.now())
        }
        setIsLoaded(true)
      }),
    onVideoStart: () => setStartedAt(Date.now()),
  }
}
