import type {PlaybackOrder} from './model'

export interface Slide {
  readonly current: string | null
  readonly remaining: readonly string[]
  readonly remainingMode?: PlaybackOrder
  readonly seen?: readonly string[]
}
export interface NextSlideOptions extends Slide {
  readonly ids: readonly string[]
  readonly mode: PlaybackOrder
}

const orderQueue = (
  queue: readonly string[],
  ids: readonly string[],
  mode: PlaybackOrder,
  current: string | null,
): string[] => {
  switch (mode) {
    case 'sequential': {
      const queuedIds = new Set(queue)
      return ids.filter((id) => queuedIds.has(id))
    }
    case 'random': {
      const shuffled = [...queue]
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const target = Math.min(index, Math.floor(Math.random() * (index + 1)))
        ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
      }
      if (shuffled.length > 1 && shuffled[0] === current) {
        ;[shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]]
      }
      return shuffled
    }
    default: {
      const unsupportedMode: never = mode
      return unsupportedMode
    }
  }
}

/** Selects the next slide, consuming each shuffled cycle before starting another. */
export const nextSlide = (options: NextSlideOptions): Slide => {
  const {ids} = options
  if (ids.length === 0) {
    return {current: null, remaining: []}
  }
  const seen = [
    ...new Set(
      (options.seen ?? (options.current === null ? [] : [options.current])).filter((id) =>
        ids.includes(id),
      ),
    ),
  ]
  const seenIds = new Set(seen)
  const queued = [
    ...new Set(options.remaining.filter((id) => ids.includes(id) && !seenIds.has(id))),
  ]
  const queuedIds = new Set(queued)
  const available = ids.filter((id) => !seenIds.has(id))
  const queue = [...queued, ...available.filter((id) => !queuedIds.has(id))]
  const startsNewCycle = queue.length === 0
  const candidates = startsNewCycle ? [...ids] : queue
  const hasModeChanged =
    queued.length > 0 &&
    options.remainingMode !== undefined &&
    options.remainingMode !== options.mode
  const shouldReorder = queued.length === 0 || hasModeChanged
  const ordered = shouldReorder
    ? orderQueue(candidates, ids, options.mode, options.current)
    : candidates
  const current = ordered[0]!
  const nextSeen = startsNewCycle ? [] : seen

  return {
    current,
    remaining: ordered.slice(1),
    remainingMode: options.mode,
    seen: [...nextSeen, current],
  }
}
