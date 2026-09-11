/** @vitest-environment node */
import {Buffer} from 'node:buffer'
import {afterEach, expect, it, vi} from 'vitest'
import {createGenerationPlan, generateExtendedSound} from '../extension'
import {generateSound} from '../runtime'
import {createStereoWave} from '../audio'

async function createWave(seconds: number, sample = 0): Promise<Blob> {
  const header = await createStereoWave(new Int32Array(0), 0).arrayBuffer()
  const bytes = seconds * 44100 * 4
  const view = new DataView(header)
  view.setUint32(4, bytes + 36, true)
  view.setUint32(40, bytes, true)
  const pattern = Buffer.alloc(2)
  pattern.writeInt16LE(sample)
  const pcm = Buffer.alloc(bytes, pattern)
  return new Blob([header, pcm], {type: 'audio/wav'})
}

vi.mock('../runtime', () => ({generateSound: vi.fn()}))
afterEach(() => vi.resetAllMocks())

it.each([0, -1, 21601, Infinity, NaN, 1.5])('should reject unbounded duration %s', (seconds) => {
  expect(() => createGenerationPlan(seconds)).toThrow()
})
it('should allocate exactly the requested duration with four seconds of context', () => {
  expect(createGenerationPlan(300)).toEqual([120, 120, 68])
  expect(createGenerationPlan(120)).toEqual([120])
  expect(createGenerationPlan(121)).toEqual([120, 5])
  const plan = createGenerationPlan(3600)
  expect(plan.length).toBe(31)
  expect(plan.reduce((total, seconds, index) => total + seconds - (index === 0 ? 0 : 4), 0)).toBe(
    3600,
  )
  expect(plan.every((seconds) => seconds <= 120)).toBe(true)
})
it('should extend sequentially using the previous tail and write exactly 300 seconds', async () => {
  let calls = 0
  vi.mocked(generateSound).mockImplementation(async (_prompt, seconds, _progress, context) => {
    calls += 1
    if (calls > 1) {
      expect(context?.start).toBe(4)
      expect(context?.end).toBe(seconds)
      expect(context?.left.length).toBe(seconds * 44100)
      expect(context?.left[0]).toBe(((calls - 1) * 1000) / 32768)
      expect(context?.right[0]).toBe(((calls - 1) * 1000) / 32768)
      expect(context?.left[4 * 44100]).toBe(0)
    }
    return createWave(seconds, calls * 1000)
  })
  const result = await generateExtendedSound('rain', 300, vi.fn())
  expect(vi.mocked(generateSound).mock.calls.map((call) => call[1])).toEqual([120, 120, 68])
  expect(result.size).toBe(44 + 300 * 44100 * 4)
  const header = new DataView(await result.slice(0, 44).arrayBuffer())
  expect(header.getUint32(40, true)).toBe(300 * 44100 * 4)
  await Promise.all(
    [
      [119, 1000],
      [120, 2000],
      [235, 2000],
      [236, 3000],
      [299, 3000],
    ].map(async ([second, sample]) => {
      const position = 44 + second * 44100 * 4
      expect(
        new DataView(await result.slice(position, position + 2).arrayBuffer()).getInt16(0, true),
      ).toBe(sample)
    }),
  )
})
it('should stop on failure without generating later chunks and allow retry', async () => {
  vi.mocked(generateSound).mockRejectedValueOnce(new Error('GPU failed'))
  await expect(generateExtendedSound('rain', 300, vi.fn())).rejects.toThrow('GPU failed')
  expect(generateSound).toHaveBeenCalledTimes(1)
  vi.mocked(generateSound).mockResolvedValue(await createWave(1))
  await expect(generateExtendedSound('rain', 1, vi.fn())).resolves.toBeInstanceOf(Blob)
})
it('should reject simultaneous generation and invalid requests before loading the model', async () => {
  await expect(generateExtendedSound('rain', 21601, vi.fn())).rejects.toThrow()
  await expect(generateExtendedSound(' ', 300, vi.fn())).rejects.toThrow()
  expect(generateSound).not.toHaveBeenCalled()
  let finish: (blob: Blob) => void = () => {}
  vi.mocked(generateSound).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const pending = generateExtendedSound('rain', 1, vi.fn())
  await vi.waitFor(() => expect(generateSound).toHaveBeenCalledTimes(1))
  await expect(generateExtendedSound('rain', 1, vi.fn())).rejects.toThrow()
  finish(await createWave(1))
  await pending
})

it.each([3601, 7200, 21600])(
  'should allow internal duration %s beyond the UI limit with bounded work',
  (seconds) => {
    const plan = createGenerationPlan(seconds)
    expect(
      plan.reduce((total, duration, index) => total + duration - (index === 0 ? 0 : 4), 0),
    ).toBe(seconds)
    expect(plan.length).toBeLessThanOrEqual(187)
    expect(plan.every((duration) => duration <= 120)).toBe(true)
    expect(seconds * 44100 * 4 + 36).toBeLessThan(2 ** 32)
  },
)

it('should accept a direct generation request beyond one hour', async () => {
  vi.mocked(generateSound).mockRejectedValueOnce(new Error('inference reached'))
  await expect(generateExtendedSound('rain', 3601, vi.fn())).rejects.toThrow('inference reached')
  expect(generateSound).toHaveBeenCalledWith('rain', 120, expect.any(Function), undefined)
})

it('should plan with a custom overlap and reject invalid or excessive work', () => {
  expect(createGenerationPlan(300, 8)).toEqual([120, 120, 76])
  for (const overlap of [0, -1, 120, Infinity, NaN, 1.5]) {
    expect(() => createGenerationPlan(300, overlap)).toThrow()
  }
  expect(() => createGenerationPlan(21600, 119)).toThrow()
})
it('should use the custom overlap for context and remove exactly that overlap', async () => {
  vi.mocked(generateSound).mockImplementation(async (_prompt, seconds, _progress, context) => {
    if (context !== undefined) {
      expect(context.start).toBe(8)
      expect(context.left[8 * 44100 - 1]).toBe(0.5)
      expect(context.left[8 * 44100]).toBe(0)
    }
    return createWave(seconds, 16384)
  })
  const result = await generateExtendedSound('rain', 121, vi.fn(), 8)
  expect(vi.mocked(generateSound).mock.calls.map((call) => call[1])).toEqual([120, 9])
  expect(result.size).toBe(44 + 121 * 44100 * 4)
})
