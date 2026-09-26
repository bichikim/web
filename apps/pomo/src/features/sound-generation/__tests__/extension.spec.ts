/** @vitest-environment node */
import {Buffer} from 'node:buffer'
import {afterEach, expect, it, vi} from 'vitest'
import {createGenerationPlan, generateExtendedSound} from '../extension'
import {generateSound} from '../runtime'
import {createStereoWave} from '../audio'
import {DEFAULT_CHUNK_NOISE_MODE, type NoiseSource} from '../noise'

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
  expect(createGenerationPlan(300)).toEqual([120, 120, 76])
  expect(createGenerationPlan(120)).toEqual([120])
  expect(createGenerationPlan(121)).toEqual([120, 9])
  const plan = createGenerationPlan(3600)
  expect(plan.length).toBe(33)
  expect(plan.reduce((total, seconds, index) => total + seconds - (index === 0 ? 0 : 8), 0)).toBe(
    3600,
  )
  expect(plan.every((seconds) => seconds <= 120)).toBe(true)
})
it('should plan independent chunks when the connection duration is disabled', () => {
  expect(createGenerationPlan(300, 0)).toEqual([120, 120, 60])
})
it('should extend sequentially using the previous tail and write exactly 300 seconds', async () => {
  let calls = 0
  vi.mocked(generateSound).mockImplementation(async (_prompt, seconds, _progress, options) => {
    calls += 1
    const context = options?.inpaint
    if (calls > 1) {
      expect(context?.start).toBe(4)
      expect(context?.end).toBe(seconds)
      expect(context?.left.length).toBe(seconds * 44100)
      expect(context?.left[0]).toBe(1000 / 32768)
      expect(context?.right[0]).toBe(1000 / 32768)
      expect(context?.left[4 * 44100]).toBe(0)
    }
    return createWave(seconds, calls * 1000)
  })
  const result = await generateExtendedSound('rain', 300, vi.fn())
  expect(vi.mocked(generateSound).mock.calls.map((call) => call[1])).toEqual([120, 120, 76])
  expect(result.size).toBe(44 + 300 * 44100 * 4)
  const header = new DataView(await result.slice(0, 44).arrayBuffer())
  expect(header.getUint32(40, true)).toBe(300 * 44100 * 4)
  await Promise.all(
    [
      [115, 1000],
      [116, 1000],
      [119, 1307],
      [120, 1000],
      [227, 1000],
      [228, 1000],
      [231, 1307],
      [232, 1000],
      [299, 1000],
    ].map(async ([second, sample]) => {
      const position = 44 + second * 44100 * 4
      expect(
        new DataView(await result.slice(position, position + 2).arrayBuffer()).getInt16(0, true),
      ).toBe(sample)
    }),
  )
})
it('should keep a quieter generated chunk at the previous level after its connection', async () => {
  let calls = 0
  vi.mocked(generateSound).mockImplementation(async (_prompt, seconds) => {
    calls += 1
    return createWave(seconds, calls === 1 ? 2000 : 1000)
  })

  const result = await generateExtendedSound('rain', 121, vi.fn())
  const readSample = async (second: number): Promise<number> => {
    const position = 44 + second * 44100 * 4
    const view = new DataView(await result.slice(position, position + 2).arrayBuffer())
    return view.getInt16(0, true)
  }

  expect(await readSample(120)).toBe(2000)
  expect(await readSample(120.5)).toBe(2000)
})
it('should prompt later chunks to continue the same sound', async () => {
  const prompts: string[] = []
  vi.mocked(generateSound).mockImplementation(async (prompt, seconds) => {
    prompts.push(prompt)
    return createWave(seconds)
  })

  await generateExtendedSound('steady rain', 121, vi.fn(), {connectionSeconds: 4})

  expect(prompts).toHaveLength(2)
  expect(prompts[0]).toBe('steady rain')
  expect(prompts[1]).toContain('Continue the exact same sound')
  expect(prompts[1]).toContain('steady rain')
})

it('should preserve the negative prompt across every generated chunk', async () => {
  const negativePrompts: Array<string | undefined> = []
  vi.mocked(generateSound).mockImplementation(async (_prompt, seconds, _progress, options) => {
    negativePrompts.push(options?.negativePrompt)
    return createWave(seconds)
  })

  await generateExtendedSound('steady thunder', 121, vi.fn(), {
    connectionSeconds: 4,
    negativePrompt: 'rain, rainfall',
  })

  expect(negativePrompts).toEqual(['rain, rainfall', 'rain, rainfall'])
})
it('should share one seeded noise stream across continuous chunks', async () => {
  const sources: NoiseSource[] = []
  vi.mocked(generateSound).mockImplementation(async (_prompt, seconds, _progress, options) => {
    const source = options?.noiseSource
    if (source !== undefined) {
      sources.push(source)
    }
    return createWave(seconds)
  })

  await generateExtendedSound('rain', 241, vi.fn(), {
    chunkNoiseMode: 'continuous',
    connectionSeconds: 4,
  })

  expect(sources).toHaveLength(3)
  expect(sources[0]).toBe(sources[1])
  expect(sources[1]).toBe(sources[2])
})

it('should restart the same seeded noise pattern for each repeated chunk', async () => {
  const sequences: number[][] = []
  vi.mocked(generateSound).mockImplementation(async (_prompt, seconds, _progress, options) => {
    const source = options?.noiseSource
    if (source !== undefined) {
      sequences.push(Array.from(source.next(4)))
    }
    return createWave(seconds)
  })

  await generateExtendedSound('rain', 241, vi.fn(), {
    chunkNoiseMode: 'repeat',
    connectionSeconds: 4,
  })

  expect(sequences).toHaveLength(3)
  expect(sequences[0]).toEqual(sequences[1])
  expect(sequences[1]).toEqual(sequences[2])
})

it('should use continuous noise by default', async () => {
  const sources: NoiseSource[] = []
  vi.mocked(generateSound).mockImplementation(async (_prompt, seconds, _progress, options) => {
    const source = options?.noiseSource
    if (source !== undefined) {
      sources.push(source)
    }
    return createWave(seconds)
  })

  await generateExtendedSound('rain', 241, vi.fn())

  expect(DEFAULT_CHUNK_NOISE_MODE).toBe('continuous')
  expect(sources[0]).toBe(sources[1])
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
      plan.reduce((total, duration, index) => total + duration - (index === 0 ? 0 : 8), 0),
    ).toBe(seconds)
    expect(plan.length).toBeLessThanOrEqual(193)
    expect(plan.every((duration) => duration <= 120)).toBe(true)
    expect(seconds * 44100 * 4 + 36).toBeLessThan(2 ** 32)
  },
)

it('should accept a direct generation request beyond one hour', async () => {
  vi.mocked(generateSound).mockRejectedValueOnce(new Error('inference reached'))
  await expect(generateExtendedSound('rain', 3601, vi.fn())).rejects.toThrow('inference reached')
  expect(generateSound).toHaveBeenCalledWith(
    'rain',
    120,
    expect.any(Function),
    expect.objectContaining({noiseSource: expect.objectContaining({next: expect.any(Function)})}),
  )
})

it('should plan with a custom connection duration and reject invalid or excessive work', () => {
  expect(createGenerationPlan(300, 8)).toEqual([120, 120, 92])
  for (const connectionSeconds of [-1, 60, Infinity, NaN, 1.5]) {
    expect(() => createGenerationPlan(300, connectionSeconds)).toThrow()
  }
  expect(() => createGenerationPlan(21600, 60)).toThrow()
})
it('should use the custom connection duration for context and remove exactly that duration', async () => {
  vi.mocked(generateSound).mockImplementation(async (_prompt, seconds, _progress, options) => {
    const context = options?.inpaint
    if (context !== undefined) {
      expect(context.start).toBe(8)
      expect(context.left[8 * 44100 - 1]).toBe(0.5)
      expect(context.left[8 * 44100]).toBe(0)
    }
    return createWave(seconds, 16384)
  })
  const result = await generateExtendedSound('rain', 121, vi.fn(), {connectionSeconds: 8})
  expect(vi.mocked(generateSound).mock.calls.map((call) => call[1])).toEqual([120, 17])
  expect(result.size).toBe(44 + 121 * 44100 * 4)
})
it('should omit inpaint context when connection duration is disabled', async () => {
  const contexts: unknown[] = []
  vi.mocked(generateSound).mockImplementation(async (_prompt, seconds, _progress, options) => {
    contexts.push(options?.inpaint)
    return createWave(seconds)
  })

  await generateExtendedSound('rain', 121, vi.fn(), {connectionSeconds: 0})

  expect(vi.mocked(generateSound).mock.calls.map((call) => call[1])).toEqual([120, 1])
  expect(contexts).toEqual([undefined, undefined])
})
