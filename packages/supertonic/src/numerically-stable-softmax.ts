import {maxBy} from 'es-toolkit/array'

/** 입력 순서와 빈 입력을 유지하면서 정규화된 지수 확률을 반환한다. */
export const numericallyStableSoftmax = (values: ReadonlyArray<number>): number[] => {
  if (values.length === 0) {
    return []
  }
  const maximum = maxBy(values, (value) => value)!
  const exponentials = values.map((value) => Math.exp(value - maximum))
  const total = exponentials.reduce((sum, value) => sum + value, 0)
  return exponentials.map((value) => value / total)
}
