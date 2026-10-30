/** @vitest-environment node */
import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'
import {createBuiltinSettings} from '../create-builtin-settings'

afterEach(() => vi.unstubAllGlobals())

it('should list bundled characters beside imports and load each from its own source', async () => {
  const repository = createBuiltinSettings(crypto.randomUUID())
  try {
    const imported = await repository.addPuppet('My character', 'imported document')
    const puppets = await repository.listPuppets()
    expect(puppets).toContainEqual({id: 'builtin:ash', name: '애시'})
    expect(puppets).toContainEqual(imported)
    const fetch = vi.fn().mockResolvedValue(new Response('bundled document'))
    vi.stubGlobal('fetch', fetch)
    const bundled = await repository.loadPuppet('builtin:ash')
    expect(bundled).toBeInstanceOf(Blob)
    expect(await (bundled as Blob).text()).toBe('bundled document')
    expect(fetch).toHaveBeenCalledWith('/builtin/models/white-cat/model.poffo')
    expect(await repository.loadPuppet(imported.id)).toBe('imported document')
    expect(fetch).toHaveBeenCalledOnce()
  } finally {
    repository.close()
  }
})

it('should report missing bundle files instead of treating an error page as a character', async () => {
  const repository = createBuiltinSettings(crypto.randomUUID())
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 404})))
  try {
    await expect(repository.loadPuppet('builtin:ash')).rejects.toThrow('404')
    await expect(repository.loadPuppet('unknown')).rejects.toThrow('missing')
    expect(
      (await repository.listPuppets()).filter((item) => item.id === 'builtin:ash'),
    ).toHaveLength(1)
  } finally {
    repository.close()
  }
})
