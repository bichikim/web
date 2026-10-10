import {concatFloat32} from 'src/utils/concat-float32'

interface JoinAudioChunksOptions {
  readonly chunks: ReadonlyArray<Float32Array>
  readonly sampleRate: number
  readonly silenceDuration: number
}

/** Joins mono PCM chunks with a fixed silence gap between adjacent utterances. */
export const joinAudioChunks = (options: JoinAudioChunksOptions): Float32Array => {
  if (options.chunks.length === 0) {
    return new Float32Array()
  }

  const silenceLength = Math.round(options.sampleRate * options.silenceDuration)
  return concatFloat32(options, silenceLength)
}
