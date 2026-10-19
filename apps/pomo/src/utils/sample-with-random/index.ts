import {sample} from 'es-toolkit/array'
import {clamp} from 'es-toolkit/math'

/** 값 하나를 추출하며, 빈 입력과 주입된 난수의 상한 처리 동작을 유지한다. */
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
