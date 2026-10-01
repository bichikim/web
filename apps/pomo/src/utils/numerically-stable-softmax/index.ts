import {maxBy} from 'es-toolkit/array'

/** Returns normalized exponential probabilities, preserving input order and empty inputs. */
export const numericallyStableSoftmax = (values: ReadonlyArray<number>): number[] => {
  if (values.length === 0) {
    return []
  }
  const maximum = maxBy(values, (value) => value)!
  const exponentials = values.map((value) => Math.exp(value - maximum))
  const total = exponentials.reduce((sum, value) => sum + value, 0)
  return exponentials.map((value) => value / total)
}
