const RATE = 44100
const CHANNELS = 256
const STRIDE = 4096
export interface InpaintAudio {
  readonly left: Float32Array
  readonly right: Float32Array
  readonly start: number
  readonly end: number
}

export function validateInpaint(audio: InpaintAudio, seconds: number) {
  if (
    audio.left.length !== seconds * RATE ||
    audio.right.length !== audio.left.length ||
    !Number.isFinite(audio.start) ||
    !Number.isFinite(audio.end) ||
    audio.start < 0 ||
    audio.end <= audio.start ||
    audio.end > seconds
  ) {
    throw new Error('연결 구간과 오디오 길이가 올바르지 않습니다.')
  }
}

export function createInpaintCondition(
  latent: ArrayLike<unknown>,
  length: number,
  start: number,
  end: number,
): Float32Array {
  if (latent.length !== CHANNELS * length) {
    throw new Error('오디오 인코더 출력 길이가 올바르지 않습니다.')
  }
  const result = new Float32Array((CHANNELS + 1) * length)
  for (let index = 0; index < length; index += 1) {
    const time = (index * STRIDE) / RATE
    const keep = time < start || time >= end ? 1 : 0
    result[index] = keep
    for (let channel = 0; channel < CHANNELS; channel += 1) {
      const value = Number(latent[channel * length + index])
      if (!Number.isFinite(value)) {
        throw new Error('오디오 인코더가 유효하지 않은 값을 반환했습니다.')
      }
      result[(channel + 1) * length + index] = value * keep
    }
  }
  return result
}

/** Restores the preserved context in-place after a diffusion step. */
export function restoreInpaintContext(
  latent: Float32Array,
  conditioning: Float32Array,
  length: number,
) {
  for (let index = 0; index < length; index += 1) {
    if (conditioning[index] === 1) {
      for (let channel = 0; channel < CHANNELS; channel += 1) {
        latent[channel * length + index] = conditioning[(channel + 1) * length + index]
      }
    }
  }
}
