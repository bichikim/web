/** @vitest-environment node */
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

  it('should round fractional silence to the nearest sample', () => {
    const samples = joinAudioChunks({
      chunks: [Float32Array.of(0.5), Float32Array.of(-0.5)],
      sampleRate: 10,
      silenceDuration: 0.15,
    })

    expect(samples).toEqual(Float32Array.of(0.5, 0, 0, -0.5))
  })

  it('should skip silence getters when no chunks were generated', () => {
    const samples = joinAudioChunks({
      chunks: [],
      get sampleRate(): number {
        throw new Error('Empty audio must not read its sample rate.')
      },
      get silenceDuration(): number {
        throw new Error('Empty audio must not read its silence duration.')
      },
    })

    expect(samples).toHaveLength(0)
  })

  it('should use one chunk collection even when another getter changes the source', () => {
    let chunks = [Float32Array.of(0.5), Float32Array.of(-0.5)]
    const samples = joinAudioChunks({
      get chunks() {
        return chunks
      },
      get sampleRate() {
        chunks = []
        return 10
      },
      silenceDuration: 0.2,
    })
    expect(samples).toEqual(Float32Array.of(0.5, 0, 0, -0.5))
  })

  it('should preserve silence gaps around empty chunks', () => {
    expect(
      joinAudioChunks({
        chunks: [Float32Array.of(0.5), new Float32Array(), Float32Array.of(-0.5)],
        sampleRate: 10,
        silenceDuration: 0.2,
      }),
    ).toEqual(Float32Array.of(0.5, 0, 0, 0, 0, -0.5))
  })
})
