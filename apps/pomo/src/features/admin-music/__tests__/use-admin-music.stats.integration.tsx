/** @vitest-environment jsdom */
import {MemoryRouter, revalidate} from '@solidjs/router'
import {cleanup, render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {AdminMusicHeader} from '../../../components/admin-music/Header'
import {type AdminCatalog} from '../catalog'
import {adminCatalogQuery} from '../catalog-query'
import {useAdminMusic} from '../use-admin-music'

const catalog: AdminCatalog = {
  albums: ['draft', 'published', 'archived'].map((status, index) => ({
    coverFallback: 'music',
    coverImageUrl: null,
    id: String(index),
    release: {blockers: [], ready: false},
    status: status as AdminCatalog['albums'][number]['status'],
    translations: [],
  })),
  assets: [],
  offers: [],
  pendingTracks: [],
  tracks: [],
}

beforeEach(async () => {
  await revalidate(adminCatalogQuery.key)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const mountStats = () => {
  let model!: ReturnType<typeof useAdminMusic>
  const Root = () => {
    model = useAdminMusic()
    return <AdminMusicHeader model={model} />
  }
  render(() => <MemoryRouter root={Root} />)
  return model
}
const numbers = () => [...document.querySelectorAll('dd')].map((node) => node.textContent)

it.each(['unknown', '__proto__', 'constructor', 'toString', null, undefined])(
  'retains prior rendered statistics when the real query rejects status %s',
  async (status) => {
    let current: unknown = catalog
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(current)),
    )
    const model = mountStats()
    await waitFor(() => expect(model.isLoading()).toBe(false))
    const beforeFailure = model.albumStats()
    current = {...catalog, albums: [{...catalog.albums[0], status}]}
    await model.runTrackImport(async () => ({created: 1, failed: 0, preserved: 0}))
    expect(model.catalogRefreshMessage()).not.toBeNull()
    expect(model.albumStats()).toBe(beforeFailure)
    expect(numbers()).toEqual(['3', '1', '1'])
  },
)

it('refreshes rendered statistics through the real query without reordering input albums', async () => {
  let current: unknown = catalog
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(current)),
  )
  const model = mountStats()
  await waitFor(() => expect(model.isLoading()).toBe(false))
  expect(numbers()).toEqual(['3', '1', '1'])
  const beforeRefresh = model.albumStats()
  current = {...catalog, albums: [catalog.albums[1], catalog.albums[1], catalog.albums[2]]}
  await model.runTrackImport(async () => ({created: 1, failed: 0, preserved: 0}))
  expect(numbers()).toEqual(['3', '0', '2'])
  expect(model.albumStats()).not.toBe(beforeRefresh)
  expect(model.catalog().albums.map((item) => item.status)).toEqual([
    'published',
    'published',
    'archived',
  ])
  current = {...catalog, albums: []}
  await model.runTrackImport(async () => ({created: 1, failed: 0, preserved: 0}))
  expect(numbers()).toEqual(['0', '0', '0'])
})
