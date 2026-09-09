/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import {backgroundSetSchema, downloadBackgroundSet, loadBackgroundSets} from '..'

const set = {
  id: 'yuna-videos',
  items: [
    {
      bytes: 3,
      id: 'sunset',
      name: 'sunset.mp4',
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      source: 'https://storage.pomofi.io/background-sets/sunset.mp4',
    },
  ],
  kind: 'video' as const,
  title: {en: 'Yuna video set', ko: '유나 영상 세트'},
}
afterEach(() => vi.unstubAllGlobals())
it('should load the versioned public catalog', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({sets: [set], version: 1})),
  )
  expect(await loadBackgroundSets(new AbortController().signal)).toEqual([set])
})
it('should validate downloaded bytes and checksum before local import', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('abc')),
  )
  const files = await downloadBackgroundSet(set, new AbortController().signal)
  expect(files[0].name).toBe('sunset.mp4')
  expect(files[0].type).toBe('video/mp4')
  expect(await files[0].text()).toBe('abc')
})
it('should reject an incorrect checksum and HTTP failures', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('xyz')),
  )
  await expect(downloadBackgroundSet(set, new AbortController().signal)).rejects.toThrow('checksum')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, {status: 404})),
  )
  await expect(loadBackgroundSets(new AbortController().signal)).rejects.toThrow('Unable')
})
it('should retain photo limits and allow videos up to 30MB', () => {
  const items = [{...set.items[0], bytes: 30_000_000}]
  expect(backgroundSetSchema.safeParse({...set, items}).success).toBe(true)
  expect(backgroundSetSchema.safeParse({...set, items, kind: 'photo'}).success).toBe(false)
  expect(
    backgroundSetSchema.safeParse({...set, items: [{...items[0], bytes: 30_000_001}]}).success,
  ).toBe(false)
})
