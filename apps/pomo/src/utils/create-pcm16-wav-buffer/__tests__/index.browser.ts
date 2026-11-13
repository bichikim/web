// oxlint-disable no-magic-numbers -- PCM16 boundary values and frame layout form the native decoder fixture.
import {expect, it} from 'vitest'
import {createPcm16WavBuffer, PCM16_WAV_HEADER_BYTES} from '..'

it.each([1, 2])(
  'should decode %i-channel generated headers with the native browser audio decoder',
  async (channels) => {
    const sampleRate = 24000
    const frames = 3
    const buffer = createPcm16WavBuffer({channels, dataBytes: frames * channels * 2, sampleRate})
    const values = [-32768, 0, 32767]
    const view = new DataView(buffer)
    for (let frame = 0; frame < frames; frame += 1) {
      for (let channel = 0; channel < channels; channel += 1) {
        view.setInt16(
          PCM16_WAV_HEADER_BYTES + (frame * channels + channel) * 2,
          values[(frame + channel) % frames]!,
          true,
        )
      }
    }
    const context = new OfflineAudioContext(channels, frames, sampleRate)
    const decoded = await context.decodeAudioData(buffer)
    expect(decoded.sampleRate).toBe(sampleRate)
    expect(decoded.numberOfChannels).toBe(channels)
    expect(decoded.length).toBe(frames)
    for (let channel = 0; channel < channels; channel += 1) {
      // Chromium maps positive full-scale PCM16 to 1; allow one quantization step.
      decoded.getChannelData(channel).forEach((sample, frame) => {
        const expected = values[(frame + channel) % frames]! / 32768
        expect(Math.abs(sample - expected)).toBeLessThanOrEqual(1 / 32768)
      })
    }
  },
)
