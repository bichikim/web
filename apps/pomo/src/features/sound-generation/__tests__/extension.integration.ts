/** @vitest-environment node */
import {Buffer} from 'node:buffer'
import {afterEach, expect, it, vi} from 'vitest'
import {generateExtendedSound} from '../extension'
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
