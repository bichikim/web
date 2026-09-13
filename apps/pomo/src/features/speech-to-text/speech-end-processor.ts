import {createSpeechEndState} from './speech-end-state'

declare const sampleRate: number
// Worklet globals are absent from the DOM library.
declare const AudioWorkletProcessor: {
  new (): {readonly port: MessagePort}
}
declare function registerProcessor(name: string, processor: typeof SpeechEndProcessor): void

const SAMPLE_SECONDS = 0.05
const MILLISECONDS_PER_SECOND = 1000

class SpeechEndProcessor extends AudioWorkletProcessor {
  private readonly state = createSpeechEndState()
  private readonly windowFrames = Math.round(sampleRate * SAMPLE_SECONDS)
  private frames = 0
  private totalFrames = 0
  private energy = 0

  process(inputs: Float32Array[][]): boolean {
    const [channels] = inputs
    const first = channels?.[0]
    if (first !== undefined) {
      for (let index = 0; index < first.length; index += 1) {
        const sample = channels.reduce((sum, channel) => sum + channel[index], 0) / channels.length
        this.energy += sample * sample
        this.frames += 1
        this.totalFrames += 1
        if (this.frames === this.windowFrames) {
          const ended = this.state.push({
            energy: Math.sqrt(this.energy / this.frames),
            timestamp: (this.totalFrames / sampleRate) * MILLISECONDS_PER_SECOND,
          })
          this.frames = 0
          this.energy = 0
          if (ended) {
            this.port.postMessage('speech-end')
          }
        }
      }
    }
    return true
  }
}

registerProcessor('speech-end', SpeechEndProcessor)
