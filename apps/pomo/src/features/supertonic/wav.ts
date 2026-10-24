import {encodeMonoPcm16Wav} from 'src/utils/encode-mono-pcm16-wav'

export const createWaveBlob = (samples: Float32Array, sampleRate: number): Blob =>
  new Blob([encodeMonoPcm16Wav(samples, sampleRate)], {type: 'audio/wav'})
