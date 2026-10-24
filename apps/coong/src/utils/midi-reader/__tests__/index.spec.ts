import {Midi} from '@winter-love/tonejs-midi'
import {describe, expect, it, vi} from 'vitest'

import {loadMidi} from '../index'

describe('loadMidi', () => {
  it('should parse an accepted file and preserve its name', async () => {
    const buffer = new Uint8Array([
      0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 0x60, 0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 4,
      0, 0xff, 0x2f, 0,
    ]).buffer
    const file = {
      arrayBuffer: vi.fn().mockResolvedValue(buffer),
      name: 'song.mid',
      size: 3,
    } as unknown as File
    const result = await loadMidi(file, buffer.byteLength)

    expect(result?.midi).toBeInstanceOf(Midi)
    expect(result?.name).toBe('song.mid')
  })

  it('should reject a file above the configured byte limit before reading it', async () => {
    const arrayBuffer = vi.fn()
    const file = {arrayBuffer, name: 'large.mid', size: 4} as unknown as File

    expect(await loadMidi(file, 3)).toBeUndefined()
    expect(arrayBuffer).not.toHaveBeenCalled()
  })

  it('should return undefined when MIDI parsing fails', async () => {
    const file = {
      arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1]).buffer),
      name: 'invalid.mid',
      size: 1,
    } as unknown as File
    expect(await loadMidi(file)).toBeUndefined()
  })
})
