import {concatFloat32} from 'src/utils/concat-float32'
import {intersperse} from 'src/utils/intersperse'

interface JoinAudioChunksOptions {
  readonly chunks: ReadonlyArray<Float32Array>
  readonly sampleRate: number
  readonly silenceDuration: number
}

/** Joins mono PCM chunks with a fixed silence gap between adjacent utterances. */
export const joinAudioChunks = (options: JoinAudioChunksOptions): Float32Array => {
  const {chunks} = options
  if (chunks.length === 0) {
    return new Float32Array()
  }

  const {sampleRate, silenceDuration} = options
  const silenceLength = Math.round(sampleRate * silenceDuration)
  if (sampleRate <= 0 || silenceDuration <= 0 || !Number.isSafeInteger(silenceLength)) {
    return concatFloat32(chunks)
  }
  return concatFloat32(intersperse(chunks, new Float32Array(silenceLength)))
}
