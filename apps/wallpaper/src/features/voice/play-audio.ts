import {createAudioPlayer} from './audio-player'

/** Plays one mono clip and releases its audio graph on completion or cancellation. */
export const playAudio = async (
  samples: Float32Array,
  sampleRate: number,
  volume: number,
  signal: AbortSignal,
): Promise<void> => {
  const player = createAudioPlayer()
  try {
    await player.enqueue({sampleRate, samples}, volume, signal)
  } finally {
    player.dispose()
  }
}
