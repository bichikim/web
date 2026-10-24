declare const sampleRate: number
declare const AudioWorkletProcessor: {new (): {readonly port: MessagePort}}
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void
const CAPACITY = 2048

class SpeechCapture extends AudioWorkletProcessor {
  private buffer = new Float32Array(CAPACITY)
  private offset = 0

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0]?.[0]
    if (input !== undefined) {
      for (const sample of input) {
        this.buffer[this.offset] = sample
        this.offset += 1
        if (this.offset === this.buffer.length) {
          this.port.postMessage({sampleRate, samples: this.buffer}, [this.buffer.buffer])
          this.buffer = new Float32Array(CAPACITY)
          this.offset = 0
        }
      }
    }
    return true
  }
}
registerProcessor('poffo-speech-capture', SpeechCapture)
