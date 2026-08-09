import {describe, expect, it} from 'vitest'

import {joinAudioChunks} from '../audio'

describe('joinAudioChunks', () => {
  it('should concatenate PCM chunks with silence only between chunks', () => {
    const samples = joinAudioChunks({
      chunks: [Float32Array.of(0.5, 0.25), Float32Array.of(-0.5)],
      sampleRate: 10,
      silenceDuration: 0.2,
    })

    expect(Array.from(samples)).toEqual([0.5, 0.25, 0, 0, -0.5])
  })

  it('should return empty audio when no chunks were generated', () => {
    expect(joinAudioChunks({chunks: [], sampleRate: 24_000, silenceDuration: 0.3})).toHaveLength(0)
  })
})
