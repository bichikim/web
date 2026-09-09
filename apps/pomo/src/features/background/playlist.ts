import type {PlaybackOrder} from './model'

export interface Slide {
  readonly seen?: readonly string[]
  readonly current: string | null
  readonly remaining: readonly string[]
}
export interface NextSlideOptions extends Slide {
  readonly ids: readonly string[]
  readonly mode: PlaybackOrder
}

/** Selects the next slide, consuming each shuffled cycle before starting another. */
export const nextSlide = (options: NextSlideOptions): Slide => {
  const {ids} = options
  if (ids.length === 0) {
    return {current: null, remaining: []}
  }
  let seen = (options.seen ?? (options.current === null ? [] : [options.current])).filter((id) =>
    ids.includes(id),
  )
  let available = ids.filter((id) => !seen.includes(id))
  if (available.length === 0) {
    seen = []
    available = [...ids]
  }
  const remaining = [...available]
  if (options.mode === 'random') {
    for (let index = remaining.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1))
      ;[remaining[index], remaining[target]] = [remaining[target], remaining[index]]
    }
    if (remaining.length > 1 && remaining[0] === options.current) {
      ;[remaining[0], remaining[1]] = [remaining[1], remaining[0]]
    }
  }
  return {current: remaining[0], remaining: remaining.slice(1), seen: [...seen, remaining[0]!]}
}
