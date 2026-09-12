import {vi} from 'vitest'

export const installAudioBuffer = () => {
  vi.stubGlobal(
    'AudioBuffer',
    class {
      readonly length: number
      readonly numberOfChannels: number
      readonly sampleRate: number
      readonly duration: number
      private readonly channels: Float32Array[]
      constructor(options: AudioBufferOptions) {
        this.length = options.length
        this.numberOfChannels = options.numberOfChannels ?? 1
        this.sampleRate = options.sampleRate
        this.duration = this.length / this.sampleRate
        this.channels = Array.from(
          {length: this.numberOfChannels},
          () => new Float32Array(this.length),
        )
      }
      getChannelData(channel: number) {
        return this.channels[channel]
      }
    },
  )
}
