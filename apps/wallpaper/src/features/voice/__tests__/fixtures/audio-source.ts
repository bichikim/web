import {vi} from 'vitest'

export class AudioSource {
  playbackRate = {value: 1}
  buffer = null
  onended: (() => void) | null = null
  connect = vi.fn((value) => value)
  disconnect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}
