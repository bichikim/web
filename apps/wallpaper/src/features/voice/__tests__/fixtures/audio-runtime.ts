import {vi} from 'vitest'
import {AudioSource} from './audio-source'

const INITIAL_TIME = 3.25

export class AudioRuntime {
  static instances: AudioRuntime[] = []
  currentTime = INITIAL_TIME
  destination = {}
  sources: AudioSource[] = []
  resume = vi.fn().mockResolvedValue(undefined)
  close = vi.fn().mockResolvedValue(undefined)
  constructor() {
    AudioRuntime.instances.push(this)
  }
  createBufferSource() {
    const source = new AudioSource()
    this.sources.push(source)
    return source
  }
  createGain() {
    return {connect: vi.fn(), disconnect: vi.fn(), gain: {value: 0}}
  }
  createBuffer(_: number, length: number, rate: number) {
    return {copyToChannel: vi.fn(), duration: length / rate}
  }
}
