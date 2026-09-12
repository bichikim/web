import {Title} from '@solidjs/meta'
import {MemoryRouter} from '@solidjs/router'
import {untrack} from 'solid-js'
import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, vi} from 'vitest'

interface ClientOnlyStubProps {
  readonly fallback?: unknown
  readonly onValuesChange?: (values: unknown) => void
  readonly values?: unknown
}

const renderFallback = vi.hoisted(
  () => (props: ClientOnlyStubProps) =>
    untrack(() => {
      if (props.onValuesChange !== undefined) {
        props.onValuesChange(props.values)
      }
      return props.fallback ?? null
    }),
)
const coverImageMocks = vi.hoisted(() => ({prepareAlbumCover: vi.fn()}))
const catalogQueryMocks = vi.hoisted(() => ({
  adminCatalogQuery: Object.assign(vi.fn(), {key: 'admin-music-catalog'}),
}))

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/start', () => ({clientOnly: vi.fn(() => renderFallback)}))
vi.mock('src/features/admin-music/cover-image', () => coverImageMocks)
vi.mock('src/features/admin-music/catalog-query', () => catalogQueryMocks)

import {AdminMusic} from '../../AdminMusic'

export const catalogWithAlbum = {
  albums: [
    {
      coverFallback: 'lp',
      coverImageUrl: null,
      id: 'album-id',
      release: {blockers: [], ready: true},
      status: 'draft',
      translations: [
        {
          albumId: 'album-id',
          description: '앨범 설명',
          locale: 'ko',
          title: '첫 앨범',
        },
      ],
    },
  ],
  assets: [],
  offers: [],
  pendingTracks: [],
  tracks: [],
} as const

beforeEach(() => {
  vi.mocked(Title).mockImplementation(() => null)
  coverImageMocks.prepareAlbumCover
    .mockReset()
    .mockResolvedValue(new File(['prepared-cover'], 'cover.webp', {type: 'image/webp'}))
  sessionStorage.clear()
  catalogQueryMocks.adminCatalogQuery.mockReset().mockImplementation(async () => {
    try {
      const response = await fetch('/api/admin/music')

      if (!response.ok) {
        throw new Error('음악 목록을 불러오지 못했습니다.')
      }

      return {catalog: await response.json(), status: 'ready'}
    } catch (error: unknown) {
      return {
        message: error instanceof Error ? error.message : '음악 목록을 불러오지 못했습니다.',
        status: 'failed',
      }
    }
  })
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.unstubAllGlobals()
})

export const renderAdminMusic = () => render(() => <MemoryRouter root={AdminMusic} />)

export {coverImageMocks}
