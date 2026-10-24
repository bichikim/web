export interface MixToMonoOptions {
  /** 각 프레임의 채널 수이다. 1 이상의 정수여야 한다. */
  readonly channels: number
  /** 프레임마다 채널 순서로 교차 배치한 샘플이다. 길이는 채널 수의 배수여야 하며, 입력은 변경하지 않는다. */
  readonly samples: Float32Array
}

/** 프레임별 채널 평균을 계산한 새 모노 배열을 반환한다. 잘못된 채널 수나 불완전한 프레임에는 RangeError를 던진다. */
export const mixToMono = (options: MixToMonoOptions): Float32Array<ArrayBuffer> => {
  const {channels, samples} = options
  if (!Number.isInteger(channels) || channels < 1) {
    throw new RangeError('Channel count must be a positive integer')
  }
  if (samples.length % channels !== 0) {
    throw new RangeError('Samples must contain complete interleaved frames')
  }

  const mono = new Float32Array(samples.length / channels)
  for (let frame = 0; frame < mono.length; frame += 1) {
    let sum = 0
    for (let channel = 0; channel < channels; channel += 1) {
      sum += samples[frame * channels + channel]
    }
    mono[frame] = sum / channels
  }
  return mono
}
