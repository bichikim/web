/** @vitest-environment jsdom */
import {MemoryRouter} from '@solidjs/router'
import {cleanup, render, screen, waitFor} from '@solidjs/testing-library'
import {createStore} from 'solid-js/store'
import {afterEach, expect, it, vi} from 'vitest'
import {AdminMusicHeader} from '../../../components/admin-music/Header'
import {type AdminAlbum, type AdminCatalog, catalogSchema} from '../catalog'
import {adminCatalogQuery} from '../catalog-query'
import {useAdminMusic} from '../use-admin-music'

vi.mock('../catalog-query', () => ({
  adminCatalogQuery: Object.assign(vi.fn(), {key: 'album-stats-fixture'}),
}))

const album = (status: AdminAlbum['status'], id: string): AdminAlbum => ({
  coverFallback: 'music',
  coverImageUrl: null,
  id,
  release: {blockers: [], ready: false},
  status,
  translations: [],
})
const catalog = (statuses: ReadonlyArray<AdminAlbum['status']>): AdminCatalog => ({
  albums: statuses.map((status, index) => album(status, String(index))),
  assets: [],
  offers: [],
  pendingTracks: [],
  tracks: [],
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
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

it.each([
  {expected: {draft: 0, published: 0, total: 0}, statuses: []},
  {expected: {draft: 1, published: 0, total: 1}, statuses: ['draft']},
  {expected: {draft: 0, published: 1, total: 1}, statuses: ['published']},
  {expected: {draft: 0, published: 0, total: 1}, statuses: ['archived']},
  {
    expected: {draft: 2, published: 1, total: 4},
    statuses: ['draft', 'published', 'archived', 'draft'],
  },
  {
    expected: {draft: 2, published: 1, total: 4},
    statuses: ['archived', 'draft', 'published', 'draft'],
  },
] satisfies ReadonlyArray<{
  statuses: ReadonlyArray<AdminAlbum['status']>
  expected: {draft: number; published: number; total: number}
}>)(
  'reports only draft/published counts and retains every album in total: $statuses',
  async (test) => {
    const data = catalog(test.statuses)
    Object.freeze(data.albums)
    vi.mocked(adminCatalogQuery).mockResolvedValue({catalog: data, status: 'ready'})
    const model = mountStats()
    await waitFor(() => expect(model.isLoading()).toBe(false), {interval: 1})
    expect(model.albumStats()).toEqual(test.expected)
    expect(Object.keys(model.albumStats())).toEqual(['draft', 'published', 'total'])
    expect(model.albumStats()).toBe(model.albumStats())
    expect(model.catalog().albums).toBe(data.albums)
    expect(data.albums.map((item) => item.status)).toEqual(test.statuses)
  },
)

it('updates the actual header through Solid store status and collection changes', async () => {
  const [data, setData] = createStore(catalog(['draft', 'published', 'archived']))
  vi.mocked(adminCatalogQuery).mockResolvedValue({catalog: data, status: 'ready'})
  const model = mountStats()
  await waitFor(() => expect(model.isLoading()).toBe(false), {interval: 1})
  const first = model.albumStats()
  const numbers = () => [...document.querySelectorAll('dd')].map((node) => node.textContent)
  expect(numbers()).toEqual(['3', '1', '1'])
  setData('albums', 0, 'status', 'published')
  expect(numbers()).toEqual(['3', '0', '2'])
  expect(model.albumStats()).not.toBe(first)
  expect(first).toEqual({draft: 1, published: 1, total: 3})
  const stable = model.albumStats()
  setData('albums', 0, 'id', 'renamed')
  expect(model.albumStats()).toBe(stable)
  setData('albums', [album('archived', 'last')])
  expect(numbers()).toEqual(['1', '0', '0'])
  setData('albums', [])
  expect(numbers()).toEqual(['0', '0', '0'])
  expect(screen.queryByRole('button', {name: '+ 새 앨범 만들기'})).toBeNull()
})

it.each(['unknown', '__proto__', 'constructor', 'toString', '', null, undefined])(
  'rejects status %s at the catalog ownership boundary',
  (status) => {
    const data = catalog(['draft'])
    expect(catalogSchema.safeParse({...data, albums: [{...data.albums[0], status}]}).success).toBe(
      false,
    )
  },
)

it('rejects holes and owns parsed records instead of retaining status getters', () => {
  expect(catalogSchema.safeParse({...catalog([]), albums: new Array(2)}).success).toBe(false)
  let reads = 0
  const input = {
    ...album('draft', 'getter'),
    get status() {
      reads += 1
      return reads === 1 ? 'draft' : 'published'
    },
  }
  const parsed = catalogSchema.parse({...catalog([]), albums: [input]})
  expect(reads).toBe(1)
  expect(parsed.albums[0] === input).toBe(false)
  expect(Object.getOwnPropertyDescriptor(parsed.albums[0], 'status')?.get).toBeUndefined()
  expect(parsed.albums[0].status).toBe('draft')
  expect(parsed.albums[0].status).toBe('draft')
  expect(reads).toBe(1)
})
