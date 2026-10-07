export interface ResampleLinearOptions {
  readonly outputLength: number
  readonly samples: Float32Array
  readonly sourceStep: number
}

/**
 * Interpolates uniformly spaced values into owned Float32 storage, holding the final sample.
 * Empty sources yield zeroes. Requires a finite positive source step and a nonnegative integer length.
 * Uses linear interpolation without filtering.
 */
export const resampleLinear = (options: ResampleLinearOptions): Float32Array => {
  const {outputLength, samples, sourceStep} = options
  const output = new Float32Array(outputLength)

  if (samples.length === 0) {
    return output
  }

  for (let index = 0; index < output.length; index += 1) {
    const sourcePosition = Math.min(index * sourceStep, samples.length - 1)
    const lowerIndex = Math.min(Math.floor(sourcePosition), samples.length - 1)
    const upperIndex = Math.min(lowerIndex + 1, samples.length - 1)
    const lowerSample = samples[lowerIndex]!
    const upperSample = samples[upperIndex]!
    output[index] = lowerSample + (upperSample - lowerSample) * (sourcePosition - lowerIndex)
  }

  return output
}
