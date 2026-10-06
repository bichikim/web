import {sample} from 'es-toolkit/array'
import {clamp} from 'es-toolkit/math'

/** Samples a value while retaining empty input and injected upper-bound behavior. */
export const sampleWithRandom = <Value>(
  values: ReadonlyArray<Value>,
  random?: () => number,
): Value | undefined => {
  if (values.length === 0) {
    return undefined
  }
  return random === undefined
    ? sample(values)
    : values[clamp(Math.floor(random() * values.length), 0, values.length - 1)]
}
