import {afterEach, expect, it, vi} from 'vitest'

interface Processor {
  readonly process: (inputs: Float32Array[][]) => boolean
}

afterEach(() => vi.unstubAllGlobals())

it.each([44_100, 48_000])(
  'should detect speech once across variable blocks at %i Hz',
  async (rate) => {
    vi.resetModules()
    const postMessage = vi.fn()
    let construct: (new () => Processor) | undefined
    vi.stubGlobal('sampleRate', rate)
    vi.stubGlobal(
      'AudioWorkletProcessor',
      class {
        readonly port = {postMessage}
      },
    )
    vi.stubGlobal('registerProcessor', (name: string, processor: new () => Processor) => {
      expect(name).toBe('speech-end')
      construct = processor
    })
    await import('../speech-end-processor')
    if (construct === undefined) {
      throw new Error('Processor was not registered')
    }
    const processor = new construct()
    const feed = (seconds: number, energy: number) => {
      let remaining = Math.round(rate * seconds)
      while (remaining > 0) {
        const count = Math.min(remaining, 127)
        const samples = new Float32Array(count).fill(energy)
        expect(processor.process([[samples, samples]])).toBe(true)
        remaining -= count
      }
    }
    expect(processor.process([[]])).toBe(true)
    feed(0.05, 0.02)
    feed(1, 0)
    expect(postMessage).not.toHaveBeenCalled()
    feed(0.15, 0.02)
    feed(0.75, 0)
    expect(postMessage).not.toHaveBeenCalled()
    feed(0.05, 0)
    expect(postMessage).toHaveBeenCalledExactlyOnceWith('speech-end')
    feed(1, 0)
    expect(postMessage).toHaveBeenCalledOnce()
  },
)
