import {statSync} from 'node:fs'
import {setImmediate} from 'node:timers/promises'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {readInputRevisions} from '../read-input-revisions'

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  const statSync = vi.fn()
  return {...actual, default: {...actual, statSync}, statSync}
})
vi.mock('node:timers/promises', async () => {
  const actual =
    await vi.importActual<typeof import('node:timers/promises')>('node:timers/promises')
  const setImmediate = vi.fn()
  return {...actual, default: {...actual, setImmediate}, setImmediate}
})
afterEach(() => vi.resetAllMocks())

describe('readInputRevisions', () => {
  it('should preserve nanosecond revision identity and missing paths', async () => {
    const stats = {
      ctimeNs: 10_000_000_000_000_008n,
      dev: 1n,
      ino: 2n,
      mtimeNs: 10_000_000_000_000_007n,
      size: 3n,
    }
    vi.mocked(statSync)
      .mockReturnValueOnce(stats as ReturnType<typeof statSync>)
      .mockReturnValueOnce(undefined)
    const revisions = await readInputRevisions(
      ['entry.ts', 'missing.ts'],
      new AbortController().signal,
    )
    expect([...revisions]).toEqual([
      ['entry.ts', '1:2:3:10000000000000007:10000000000000008'],
      ['missing.ts', null],
    ])
  })
  it('should retain the existing null contract for metadata errors', async () => {
    vi.mocked(statSync).mockImplementation(() => {
      throw new Error('unreadable')
    })
    expect(
      (await readInputRevisions(['entry.ts'], new AbortController().signal)).get('entry.ts'),
    ).toBeNull()
  })
  it('should stop before reading when already cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(readInputRevisions(['entry.ts'], controller.signal)).rejects.toThrow()
    expect(statSync).not.toHaveBeenCalled()
  })
  it('should yield between bounded batches and honor cancellation before more reads', async () => {
    const controller = new AbortController()
    vi.mocked(setImmediate).mockImplementationOnce(async () => {
      controller.abort()
    })
    const PATH_COUNT = 1025
    await expect(
      readInputRevisions(
        Array.from({length: PATH_COUNT}, (_, index) => `file-${index}`),
        controller.signal,
      ),
    ).rejects.toThrow()
    const inspected = vi.mocked(statSync).mock.calls.length
    expect(inspected).toBeGreaterThan(0)
    expect(inspected).toBeLessThan(PATH_COUNT)
    expect(setImmediate).toHaveBeenCalledTimes(1)
  })
  it('should inspect every path across multiple batches', async () => {
    const PATH_COUNT = 1025
    const paths = Array.from({length: PATH_COUNT}, (_, index) => `file-${index}`)
    const revisions = await readInputRevisions(paths, new AbortController().signal)
    expect([...revisions.keys()]).toEqual(paths)
    expect(statSync).toHaveBeenCalledTimes(PATH_COUNT)
    expect(setImmediate).toHaveBeenCalled()
  })
  it('should return no revisions for empty input', async () => {
    expect((await readInputRevisions([], new AbortController().signal)).size).toBe(0)
    expect(statSync).not.toHaveBeenCalled()
  })
})
