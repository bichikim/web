import type {Player} from '../create-player'
import {analyzeVowels, type AnalyzeVowelsOptions} from './analyze-vowels'

/** About 43 ms at 48 kHz: long enough for two formants, short enough to follow speech. */
const FRAME_SIZE = 2048

export interface ConnectVoiceMouthShapesOptions {
  readonly analysis?: AnalyzeVowelsOptions
  readonly player: Pick<Player, 'setVowelWeights'>
  /** Voice audio, such as a microphone `MediaStreamAudioSourceNode`. */
  readonly source: AudioNode
}

/**
 * Drives the player's mouth shapes from `source`: each animation frame analyzes the latest audio
 * and sets the vowel weights. The returned function disconnects and fades the shapes out.
 */
export const connectVoiceMouthShapes = (options: ConnectVoiceMouthShapesOptions) => {
  const analyser = options.source.context.createAnalyser()
  analyser.fftSize = FRAME_SIZE
  options.source.connect(analyser)
  const samples = new Float32Array(FRAME_SIZE)
  let frame = 0
  const analyze = () => {
    analyser.getFloatTimeDomainData(samples)
    options.player.setVowelWeights(
      analyzeVowels(samples, analyser.context.sampleRate, options.analysis).weights,
    )
    frame = requestAnimationFrame(analyze)
  }
  frame = requestAnimationFrame(analyze)
  return () => {
    cancelAnimationFrame(frame)
    options.source.disconnect(analyser)
    options.player.setVowelWeights(undefined)
  }
}
