/** @vitest-environment node */
import {mkdtemp, readdir, rm, utimes, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, expect, it} from 'vitest'
import {pruneTransformCache} from '../prune-transform-cache'

const directories: string[] = []
const DAY = 24 * 60 * 60 * 1000
const NOW = 20 * DAY
const OLD = 10 * DAY
const CACHE_FILE = `${'a'.repeat(64)}.json`

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, {force: true, recursive: true})),
  )
})

it('should remove old cache entries and abandoned writes while retaining recent and unrelated files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pomo-prune-'))
  directories.push(directory)
  const files = [
    CACHE_FILE,
    `${CACHE_FILE}.abandoned.tmp`,
    `${'b'.repeat(64)}.json`,
    'unrelated.json',
  ]
  await Promise.all(
    files.map(async (file) => {
      await writeFile(join(directory, file), '{}')
      await utimes(join(directory, file), OLD / 1000, OLD / 1000)
    }),
  )
  await utimes(join(directory, files[2]), NOW / 1000, NOW / 1000)
  await pruneTransformCache(directory, NOW)
  expect((await readdir(directory)).sort()).toEqual(['.last-cleanup', files[2], 'unrelated.json'])
})

it('should avoid rescanning within a day and tolerate overlapping cleanup', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pomo-prune-'))
  directories.push(directory)
  await pruneTransformCache(directory, NOW)
  const path = join(directory, CACHE_FILE)
  await writeFile(path, '{}')
  await utimes(path, OLD / 1000, OLD / 1000)
  await pruneTransformCache(directory, NOW + DAY / 2)
  expect(await readdir(directory)).toContain(CACHE_FILE)
  await Promise.all([
    pruneTransformCache(directory, NOW + DAY),
    pruneTransformCache(directory, NOW + DAY),
  ])
  expect((await readdir(directory)).sort()).toEqual(['.last-cleanup'])
})
