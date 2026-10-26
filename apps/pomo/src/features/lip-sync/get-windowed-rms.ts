export interface GetWindowedRmsOptions {
  readonly hopSamples: number
  readonly samples: Readonly<ArrayLike<number>>
  readonly windowSamples: number
}

const getRms = (samples: Readonly<ArrayLike<number>>, start: number, end: number): number => {
  let squareTotal = 0

  for (let index = start; index < end; index += 1) {
    const sample = samples[index] ?? 0
    squareTotal += sample * sample
  }

  return end > start ? Math.sqrt(squareTotal / (end - start)) : 0
}

/**
 * 샘플 이동 간격마다 RMS 값을 반환하고 윈도 범위를 사용 가능한 샘플로 제한한다.
 * 누락된 샘플과 빈 윈도는 0으로 처리하며, 샘플을 복사하거나 변경하지 않고 읽는다.
 * 윈도 크기와 이동 간격은 양의 정수, NaN, 양의 Infinity를 허용하며, 다른 값은 예외를 던진다.
 * 윈도 크기가 NaN이면 0을 반환하고, 이동 간격이 NaN 또는 Infinity이면 윈도를 최대 하나 만든다.
 */
export const getWindowedRms = (options: GetWindowedRmsOptions): ReadonlyArray<number> => {
  const {hopSamples, samples, windowSamples} = options

  if (
    hopSamples <= 0 ||
    windowSamples <= 0 ||
    (Number.isFinite(hopSamples) && !Number.isInteger(hopSamples)) ||
    (Number.isFinite(windowSamples) && !Number.isInteger(windowSamples))
  ) {
    throw new RangeError('Window and hop counts must be positive integers, NaN, or Infinity.')
  }

  const levels: number[] = []

  for (let start = 0; start < samples.length; start += hopSamples) {
    const end = Math.min(samples.length, start + windowSamples)
    levels.push(getRms(samples, start, end))
  }

  return levels
}
