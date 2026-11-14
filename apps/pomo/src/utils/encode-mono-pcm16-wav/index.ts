import {clamp} from 'es-toolkit/math'
import {createPcm16WavBuffer, PCM16_WAV_HEADER_BYTES} from '../create-pcm16-wav-buffer/index.ts'
// oxlint-disable no-magic-numbers -- PCM WAV 명세에 정의된 고정 오프셋과 범위 상수다.
/** 모노 부동소수점 샘플을 리틀 엔디언 PCM16 RIFF/WAVE 바이트로 인코딩한다. */
export const encodeMonoPcm16Wav = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
  const buffer = createPcm16WavBuffer({channels: 1, dataBytes: samples.length * 2, sampleRate})
  const view = new DataView(buffer)

  for (let index = 0; index < samples.length; index += 1) {
    const sample = clamp(samples[index], -1, 1)
    view.setInt16(
      PCM16_WAV_HEADER_BYTES + index * 2,
      sample < 0 ? sample * 32_768 : sample * 32_767,
      true,
    )
  }

  return buffer
}
