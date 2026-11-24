import {afterEach, expect, test, vi} from 'vitest'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {mkdtemp, readdir, readFile, rename, rm, utimes, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {prepareModelAsset} from '../index.mjs'

const directories = []
const directory = async () => {
  const path = await mkdtemp(join(tmpdir(), 'wallpaper-model-cache-'))
  directories.push(path)
  return path
}
const file = {
  path: 'model.bin',
  sha256: createHash('sha256').update('model').digest('hex'),
  size: 5,
}
afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(directories.splice(0).map((path) => rm(path, {force: true, recursive: true})))
})

test('should download a missing model once and reuse it without network access', async () => {
  const cache = await directory()
  const response = Promise.withResolvers()
  const fetchAsset = vi.fn().mockReturnValue(response.promise)
  vi.stubGlobal('fetch', fetchAsset)
  const first = prepareModelAsset(cache, file, 'https://model.invalid/weights')
  const second = prepareModelAsset(cache, file, 'https://model.invalid/weights')
  response.resolve(new Response('model'))
  const [path, reused] = await Promise.all([first, second])
  expect(path).toBe(reused)
  expect(await readFile(path, 'utf8')).toBe('model')
  fetchAsset.mockRejectedValue(new Error('offline'))
  expect(await prepareModelAsset(cache, file, 'https://model.invalid/weights')).toBe(path)
  expect(fetchAsset).toHaveBeenCalledTimes(1)
})
test('should discard an invalid download and allow a valid retry', async () => {
  const cache = await directory()
  const fetchAsset = vi
    .fn()
    .mockResolvedValueOnce(new Response('wrong'))
    .mockResolvedValueOnce(new Response('model'))
  vi.stubGlobal('fetch', fetchAsset)
  await expect(prepareModelAsset(cache, file, 'https://model.invalid/weights')).rejects.toThrow(
    'checksum',
  )
  expect(await readdir(cache)).toEqual([])
  expect(
    await readFile(await prepareModelAsset(cache, file, 'https://model.invalid/weights'), 'utf8'),
  ).toBe('model')
})
test('should migrate valid legacy weights without downloading or retaining a duplicate', async () => {
  const cache = await directory()
  const previous = await directory()
  await writeFile(join(previous, file.path), 'model')
  const fetchAsset = vi.fn().mockRejectedValue(new Error('offline'))
  vi.stubGlobal('fetch', fetchAsset)
  expect(
    await readFile(
      await prepareModelAsset(cache, file, 'https://model.invalid/weights', [previous]),
      'utf8',
    ),
  ).toBe('model')
  expect(await readdir(previous)).toEqual([])
  expect(fetchAsset).not.toHaveBeenCalled()
})

test.each(['during-rename', 'before-source-check'])(
  'should reuse weights when another process wins the race (%s)',
  async (timing) => {
    const cache = await directory()
    const previous = await directory()
    await writeFile(join(previous, file.path), 'model')
    const program = `
    import fs from 'node:fs/promises'
    import {syncBuiltinESMExports} from 'node:module'
    import {join} from 'node:path'
    const [moduleUrl, cache, previous, descriptor, timing] = process.argv.slice(1)
    const file = JSON.parse(descriptor)
    const rename = fs.rename
    const stat = fs.stat
    let raced = false
    if (timing === 'during-rename') {
      fs.rename = async (source, destination) => {
        await rename(source, destination)
        raced = true
        throw Object.assign(new Error('Legacy source disappeared'), {code: 'ENOENT'})
      }
    } else {
      fs.stat = async (path, options) => {
        if (!raced && path === join(previous, file.path)) {
          await rename(path, join(cache, file.path))
          raced = true
        }
        return stat(path, options)
      }
    }
    syncBuiltinESMExports()
    globalThis.fetch = () => { throw new Error('Unexpected download') }
    const {prepareModelAsset} = await import(moduleUrl)
    const prepared = await prepareModelAsset(cache, file, 'https://model.invalid/weights', [previous])
    if (!raced) throw new Error('Expected a competing cache move')
    process.stdout.write(prepared)
  `
    const prepared = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        program,
        pathToFileURL(resolve('packages/model-cache/index.mjs')).href,
        cache,
        previous,
        JSON.stringify(file),
        timing,
      ],
      {encoding: 'utf8'},
    )
    expect(await readFile(prepared, 'utf8')).toBe('model')
    expect(await readdir(previous)).toEqual([])
  },
)

test('should repair an invalid shared file before returning it', async () => {
  const cache = await directory()
  await writeFile(join(cache, file.path), 'wrong')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('model')))
  const path = await prepareModelAsset(cache, file, 'https://model.invalid/weights')
  expect(await readFile(path, 'utf8')).toBe('model')
})

test('should revalidate a replaced model even when its size and modification time match', async () => {
  const cache = await directory()
  const path = join(cache, file.path)
  const modified = new Date('2026-01-01T00:00:00Z')
  await writeFile(path, 'model')
  await utimes(path, modified, modified)
  const fetchAsset = vi.fn().mockResolvedValue(new Response('model'))
  vi.stubGlobal('fetch', fetchAsset)
  await prepareModelAsset(cache, file, 'https://model.invalid/weights')
  const replacement = join(cache, 'replacement.bin')
  await writeFile(replacement, 'wrong')
  await utimes(replacement, modified, modified)
  await rename(replacement, path)
  const prepared = await prepareModelAsset(cache, file, 'https://model.invalid/weights')
  expect(await readFile(prepared, 'utf8')).toBe('model')
  expect(fetchAsset).toHaveBeenCalledOnce()
})
test('should reject oversized responses without leaving partial weights', async () => {
  const cache = await directory()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('too much data')))
  await expect(prepareModelAsset(cache, file, 'https://model.invalid/weights')).rejects.toThrow(
    'exceeds',
  )
  expect(await readdir(cache)).toEqual([])
})
test('should reject paths outside the model directory without downloading', async () => {
  const cache = await directory()
  const fetchAsset = vi.fn()
  vi.stubGlobal('fetch', fetchAsset)
  await expect(
    prepareModelAsset(cache, {...file, path: '../outside'}, 'https://model.invalid/weights'),
  ).rejects.toThrow('Invalid')
  expect(fetchAsset).not.toHaveBeenCalled()
  expect(await readdir(cache)).toEqual([])
})
