/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {prepareVideoBackground, removeVideoBackground} from '..'
import {sampleVideo} from '../sample'

const records = vi.hoisted(() => new Map<string, unknown>())
vi.mock('dexie', () => ({
  default: class {
    version() {
      return {stores: vi.fn()}
    }
    table() {
      return {
        delete: async (id: string) => {
          records.delete(id)
        },
        get: async (id: string) => records.get(id),
        put: async (value: {id: string}) => {
          records.set(value.id, value)
        },
      }
    }
  },
}))
vi.mock('../sample', () => ({sampleVideo: vi.fn()}))
const samples = [{height: 1, pixels: new Uint8ClampedArray([255, 0, 0, 255]), time: 0, width: 1}]
beforeEach(() => {
  records.clear()
  vi.clearAllMocks()
  vi.mocked(sampleVideo).mockResolvedValue(samples)
})

it('should deduplicate pending analysis and reuse persisted samples', async () => {
  const blob = new Blob()
  const first = prepareVideoBackground('cache', blob)
  expect(prepareVideoBackground('cache', blob)).toBe(first)
  await expect(first).resolves.toEqual(samples)
  await expect(prepareVideoBackground('cache', blob)).resolves.toEqual(samples)
  expect(sampleVideo).toHaveBeenCalledOnce()
})
it('should serialize decoders for different videos', async () => {
  let finish: ((value: typeof samples) => void) | undefined
  vi.mocked(sampleVideo).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const first = prepareVideoBackground('one', new Blob())
  const second = prepareVideoBackground('two', new Blob())
  await vi.waitFor(() => expect(sampleVideo).toHaveBeenCalledOnce())
  finish!(samples)
  await Promise.all([first, second])
  expect(sampleVideo).toHaveBeenCalledTimes(2)
})
it('should cancel pending analysis and prevent a cache write after removal', async () => {
  let signal: AbortSignal | undefined
  vi.mocked(sampleVideo).mockImplementationOnce((_, current) => {
    signal = current
    return new Promise((_, reject) => {
      current.addEventListener('abort', () => reject(current.reason))
    })
  })
  const preparation = prepareVideoBackground('removed', new Blob())
  await vi.waitFor(() => expect(signal).toBeDefined())
  await removeVideoBackground('removed')
  expect(signal!.aborted).toBe(true)
  await expect(preparation).resolves.toBeNull()
  expect(records.has('removed')).toBe(false)
})
it('should report a failed analysis without blocking the next video', async () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.mocked(sampleVideo).mockRejectedValueOnce(new Error('decode'))
  await expect(prepareVideoBackground('bad', new Blob())).resolves.toBeNull()
  await expect(prepareVideoBackground('good', new Blob())).resolves.toEqual(samples)
  expect(warning).toHaveBeenCalledOnce()
  warning.mockRestore()
})
