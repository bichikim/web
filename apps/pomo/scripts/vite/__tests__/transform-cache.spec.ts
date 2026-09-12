/** @vitest-environment node */
import {mkdtemp, readdir, rm, stat, utimes, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, expect, it, vi} from 'vitest'
import {createTransformCache} from '../transform-cache'

const directories: string[] = []
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, {force: true, recursive: true})),
  )
})

it('should reuse persisted transforms and invalidate changed inputs or configuration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pomo-transform-'))
  directories.push(directory)
  const compute = vi.fn().mockResolvedValue({code: 'output', map: '{"version":3}'})
  const first = createTransformCache(directory, 'config-1')
  expect(await first('input-1', compute)).toEqual({code: 'output', map: '{"version":3}'})
  const restarted = createTransformCache(directory, 'config-1')
  expect(await restarted('input-1', compute)).toEqual({code: 'output', map: '{"version":3}'})
  expect(compute).toHaveBeenCalledTimes(1)
  await restarted('input-2', compute)
  await createTransformCache(directory, 'config-2')('input-1', compute)
  expect(compute).toHaveBeenCalledTimes(3)
})

it('should recompute corrupt entries and tolerate an unavailable cache directory', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pomo-transform-'))
  directories.push(directory)
  const compute = vi.fn().mockResolvedValue({code: 'output', map: null})
  const cache = createTransformCache(directory, 'config')
  await cache('input', compute)
  const [filename] = (await readdir(directory)).filter((name) => name.endsWith('.json'))
  await writeFile(join(directory, filename), '{"code":false}')
  await cache('input', compute)
  await createTransformCache(join(directory, filename), 'config')('input', compute)
  expect(compute).toHaveBeenCalledTimes(3)
})

it('should propagate transform failures without caching them', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pomo-transform-'))
  directories.push(directory)
  const cache = createTransformCache(directory, 'config')
  const error = new Error('transform failed')
  const compute = vi.fn().mockRejectedValueOnce(error).mockResolvedValue({code: 'fixed', map: null})
  await expect(cache('input', compute)).rejects.toBe(error)
  await expect(cache('input', compute)).resolves.toEqual({code: 'fixed', map: null})
})

it('should keep a readable entry when builds write the same key concurrently', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pomo-transform-'))
  directories.push(directory)
  const compute = vi.fn().mockResolvedValue({code: 'output', map: null})
  await Promise.all([
    createTransformCache(directory, 'config')('input', compute),
    createTransformCache(directory, 'config')('input', compute),
  ])
  compute.mockClear()
  await expect(createTransformCache(directory, 'config')('input', compute)).resolves.toEqual({
    code: 'output',
    map: null,
  })
  expect(compute).not.toHaveBeenCalled()
  expect((await readdir(directory)).filter((name) => name.endsWith('.json'))).toHaveLength(1)
})

it('should renew retention when reusing a persisted transform', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pomo-transform-'))
  directories.push(directory)
  const compute = vi.fn().mockResolvedValue({code: 'output', map: null})
  await createTransformCache(directory, 'config')('input', compute)
  const [filename] = (await readdir(directory)).filter((name) => name.endsWith('.json'))
  const path = join(directory, filename)
  const previous = new Date(Date.now() - 6 * 86_400_000)
  await utimes(path, previous, previous)
  const started = Date.now()

  await createTransformCache(directory, 'config')('input', compute)

  expect(compute).toHaveBeenCalledTimes(1)
  expect((await stat(path)).mtimeMs).toBeGreaterThanOrEqual(started - 1)
})
