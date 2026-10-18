export interface ResampleLinearOptions {
  readonly outputLength: number
  readonly samples: Float32Array
  readonly sourceStep: number
}

/**
 * 등간격 값을 새 Float32 버퍼에 보간하고, 원본 범위를 벗어나면 마지막 샘플을 유지한다.
 * 원본이 비어 있으면 0으로 채운다. 원본 간격은 유한한 양수, 출력 길이는 0 이상의 정수여야 한다.
 * 필터링 없이 선형 보간을 사용한다.
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
