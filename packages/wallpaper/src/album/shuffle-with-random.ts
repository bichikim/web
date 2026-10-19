import {shuffle} from 'es-toolkit/array'
import {clamp} from 'es-toolkit/math'

/** Shuffles a copy using the platform source or a caller-owned random source. */
export const shuffleWithRandom = <Value>(
  values: ReadonlyArray<Value>,
  random?: () => number,
): Value[] => {
  if (random === undefined) {
    return shuffle(values)
  }
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = clamp(Math.floor(random() * (index + 1)), 0, index)
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled
}
