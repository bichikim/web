/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import {createStereoWave} from '../audio'
import {generateLoopSound} from '../loop'
import {generateSound} from '../runtime'

vi.mock('../runtime', () => ({generateSound: vi.fn()}))
afterEach(() => vi.resetAllMocks())

const RATE = 44100

it('should place separate tail channels before separate head channels in loop context', async () => {
  const source = createStereoWave(new Int32Array(14 * RATE * 2), 14 * RATE)
  const buffer = await source.arrayBuffer()
  const view = new DataView(buffer)
  const tailStart = buffer.byteLength - 6 * RATE * 4
  view.setInt16(tailStart, -32768, true)
  view.setInt16(tailStart + 2, 32767, true)
  view.setInt16(44, 16384, true)
  view.setInt16(46, -16384, true)
  const generatedPatch = createStereoWave(new Int32Array(12 * RATE * 2), 12 * RATE)
  vi.mocked(generateSound).mockImplementation(async (_prompt, _seconds, _progress, options) => {
    const context = options?.inpaint
    expect(context?.left[0]).toBe(-1)
    expect(context?.right[0]).toBe(32767 / 32768)
    expect(context?.left[6 * RATE]).toBe(0.5)
    expect(context?.right[6 * RATE]).toBe(-0.5)
    return generatedPatch
  })

  const result = await generateLoopSound(new Blob([buffer]), 'rain', vi.fn())

  expect(generateSound).toHaveBeenCalledOnce()
  expect(result.size).toBe(source.size)
})
