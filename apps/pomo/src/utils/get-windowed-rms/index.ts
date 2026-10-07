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
 * Returns RMS values at successive sample hops, clipping windows to the available samples.
 * Missing samples and empty windows yield zero; samples are read without copying or mutation.
 * Window and hop counts accept positive integers, NaN, or positive Infinity; other counts throw.
 * NaN windows yield zero and NaN/Infinity hops produce at most one window.
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
