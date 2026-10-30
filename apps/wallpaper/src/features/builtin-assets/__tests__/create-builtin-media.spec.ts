/** @vitest-environment node */
import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'
import {createBuiltinMedia} from '../create-builtin-media'

afterEach(() => vi.unstubAllGlobals())

it('should make all bundled covers and wallpapers available without importing them', async () => {
  const repository = createBuiltinMedia(crypto.randomUUID())
  try {
    const album = await repository.read()
    expect(album.items).toHaveLength(13)
    expect(album.items.filter((item) => item.id.startsWith('builtin:cover:'))).toHaveLength(10)
    expect(album.items.find((item) => item.id === 'builtin:wallpaper:window')).toMatchObject({
      kind: 'video',
    })
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('picture', {headers: {'Content-Type': 'image/webp'}}))
    vi.stubGlobal('fetch', fetch)
    const blob = await repository.load('builtin:cover:window')
    expect(blob.type).toBe('image/webp')
    expect(blob.size).toBe(7)
    expect(fetch).toHaveBeenCalledWith('/builtin/wallpapers/ash-afternoon/window.webp')
    expect((await repository.read()).items.map((item) => item.id)).toEqual(
      album.items.map((item) => item.id),
    )
  } finally {
    repository.close()
  }
})

it('should retain imported media and load it without fetching a bundled asset', async () => {
  const repository = createBuiltinMedia(crypto.randomUUID())
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  try {
    const file = new File(['photo'], 'mine.webp', {type: 'image/webp'})
    const id = await repository.importMedia(file, 'photo')
    expect((await repository.read()).items).toContainEqual(
      expect.objectContaining({id, name: 'mine.webp'}),
    )
    expect((await repository.load(id)).size).toBe(file.size)
    expect(fetch).not.toHaveBeenCalled()
  } finally {
    repository.close()
  }
})

it('should reject a missing bundle file and retain the selectable catalog for retry', async () => {
  const repository = createBuiltinMedia(crypto.randomUUID())
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 404})))
  try {
    await expect(repository.load('builtin:cover:window')).rejects.toThrow('404')
    expect((await repository.read()).items).toHaveLength(13)
  } finally {
    repository.close()
  }
})
