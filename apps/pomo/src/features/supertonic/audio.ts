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
  const totalLength =
    options.chunks.reduce((total, chunk) => total + chunk.length, 0) +
    silenceLength * (options.chunks.length - 1)
  const samples = new Float32Array(totalLength)
  let offset = 0

  for (const chunk of options.chunks) {
    samples.set(chunk, offset)
    offset += chunk.length + silenceLength
  }

  return samples
}
