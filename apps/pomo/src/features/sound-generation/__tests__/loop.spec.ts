/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import {createStereoWave} from '../audio'
import {generateLoopSound} from '../loop'
import {generateSound} from '../runtime'

vi.mock('../runtime', () => ({generateSound: vi.fn()}))
afterEach(() => vi.resetAllMocks())
const RATE = 44100

it.each([4, 2, 7.5])(
  'should wrap a generated %s-second transition and preserve duration and middle samples',
  async (transition) => {
    const frames = 49 * RATE
    const original = new Int32Array(frames * 2)
    original.fill(1000, 0, 8 * RATE * 2)
    original.fill(2000, 8 * RATE * 2)
    const source = createStereoWave(original, frames)
    vi.mocked(generateSound).mockImplementation(async (prompt, seconds, _progress, context) => {
      expect(prompt).toBe('rain')
      expect(seconds).toBe(12)
      expect(context?.start).toBe(6 - transition / 2)
      expect(context?.end).toBe(6 + transition / 2)
      expect(context?.left[0]).toBe(2000 / 32768)
      expect(context?.left[6 * RATE]).toBe(1000 / 32768)
      expect(context?.right[0]).toBe(2000 / 32768)
      const patch = new Int32Array(12 * RATE * 2).fill(3000)
      patch[(6 * RATE - 1) * 2] = 3100
      patch[6 * RATE * 2] = 3101
      return createStereoWave(patch, 12 * RATE)
    })
    const result = await generateLoopSound(source, 'rain', vi.fn(), transition)
    expect(result.size).toBe(source.size)
    const view = new DataView(await result.arrayBuffer())
    expect(view.getInt16(44, true)).toBe(3101)
    expect(view.getInt16(result.size - 4, true)).toBe(3100)
    const edge = Math.round((transition / 2) * RATE) * 4
    expect(await result.slice(44 + edge, result.size - edge).arrayBuffer()).toEqual(
      await source.slice(44 + edge, source.size - edge).arrayBuffer(),
    )
    expect(view.getInt16(44 + edge - 4, true)).toBe(1000)
    expect(view.getInt16(result.size - edge, true)).toBe(2000)
  },
)
it('should default to a four-second transition', async () => {
  const source = createStereoWave(new Int32Array(12 * RATE * 2), 12 * RATE)
  vi.mocked(generateSound).mockResolvedValue(source)
  await generateLoopSound(source, 'rain', vi.fn())
  expect(generateSound).toHaveBeenCalledWith(
    'rain',
    12,
    expect.any(Function),
    expect.objectContaining({end: 8, start: 4}),
  )
})
it('should reject unsupported WAV, short audio and invalid transitions before inference', async () => {
  const source = createStereoWave(new Int32Array(12 * RATE * 2), 12 * RATE)
  await expect(generateLoopSound(new Blob(['invalid']), 'rain', vi.fn())).rejects.toThrow()
  await expect(
    generateLoopSound(createStereoWave(new Int32Array(88200), RATE), 'rain', vi.fn()),
  ).rejects.toThrow()
  await expect(generateLoopSound(source, ' ', vi.fn())).rejects.toThrow()
  await Promise.all(
    [0, -1, 9, NaN, Infinity].map((transition) =>
      expect(generateLoopSound(source, 'rain', vi.fn(), transition)).rejects.toThrow(),
    ),
  )
  const malformed = new Uint8Array(await source.arrayBuffer())
  new DataView(malformed.buffer).setUint32(24, 48000, true)
  await expect(generateLoopSound(new Blob([malformed]), 'rain', vi.fn())).rejects.toThrow()
  expect(generateSound).not.toHaveBeenCalled()
})
it('should propagate inference failure and reject malformed generated output', async () => {
  const source = createStereoWave(new Int32Array(12 * RATE * 2), 12 * RATE)
  vi.mocked(generateSound).mockRejectedValueOnce(new Error('GPU failed'))
  await expect(generateLoopSound(source, 'rain', vi.fn())).rejects.toThrow('GPU failed')
  vi.mocked(generateSound).mockResolvedValue(new Blob(['bad patch']))
  await expect(generateLoopSound(source, 'rain', vi.fn())).rejects.toThrow()
})
