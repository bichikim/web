/** @vitest-environment node */
import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'
import {createBuiltinMedia} from '../create-builtin-media'

afterEach(() => vi.unstubAllGlobals())

it('should make all bundled covers and wallpapers available without importing them', async () => {
  const repository = createBuiltinMedia(crypto.randomUUID())
  try {
    const album = await repository.read()
    expect(album.items).toHaveLength(10)
    expect(album.items.every((item) => item.id.startsWith('builtin:cover:'))).toBe(true)
    expect(album.items.filter((item) => item.id.startsWith('builtin:cover:'))).toHaveLength(10)
    expect(album.items.some((item) => item.kind === 'video')).toBe(false)
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
    expect((await repository.read()).items).toHaveLength(10)
  } finally {
    repository.close()
  }
})

it('should persist hidden builtins across reopen and restore only bundled images', async () => {
  const name = crypto.randomUUID()
  const repository = createBuiltinMedia(name)
  const file = new File(['photo'], 'mine.webp', {type: 'image/webp'})
  const id = await repository.importMedia(file, 'photo')
  await repository.remove('builtin:cover:window')
  await repository.remove(id)
  repository.close()
  const reopened = createBuiltinMedia(name)
  try {
    const hidden = await reopened.read()
    expect(hidden.items.some((item) => item.id === 'builtin:cover:window')).toBe(false)
    expect(hidden.hiddenCount).toBe(1)
    await expect(reopened.load(id)).rejects.toThrow('missing')
    await reopened.restoreBuiltins()
    expect((await reopened.read()).items.some((item) => item.id === 'builtin:cover:window')).toBe(
      true,
    )
    expect((await reopened.read()).items.some((item) => item.id === id)).toBe(false)
    expect((await reopened.read()).items.some((item) => item.kind === 'video')).toBe(false)
  } finally {
    reopened.close()
  }
})

it('should notify another library instance when a built-in image is hidden or restored', async () => {
  const name = crypto.randomUUID()
  const first = createBuiltinMedia(name)
  const second = createBuiltinMedia(name)
  const changed = Promise.withResolvers<void>()
  const restored = Promise.withResolvers<void>()
  let hidden = false
  const stop = second.subscribe(async () => {
    const snapshot = await second.read()
    if (snapshot.hiddenCount > 0) {
      hidden = true
      changed.resolve()
    } else if (hidden) {
      restored.resolve()
    }
  }, changed.reject)
  try {
    await first.remove('builtin:cover:window')
    await changed.promise
    await first.restoreBuiltins()
    await restored.promise
  } finally {
    stop()
    first.close()
    second.close()
  }
})
