/** @vitest-environment jsdom */

import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {type JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const audioMocks = vi.hoisted(() => ({
  loadBundledPAlbums: vi.fn(),
  loadPublishedPAlbums: vi.fn(),
  publishedAlbumCatalogQuery: Object.assign(vi.fn(), {
    key: 'published-focus-room-album-catalog',
    keyFor: vi.fn(),
  }),
}))

vi.mock('@solidjs/router', async () => {
  const actual: typeof import('@solidjs/router') = await vi.importActual('@solidjs/router')
  return {
    ...actual,
    action: vi.fn((clientAction) => clientAction),
    useAction: vi.fn((clientAction) => clientAction),
    useSubmissions: vi.fn(() => []),
  }
})
vi.mock('../../../features/focus-room-audio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../features/focus-room-audio')>()),
  ...audioMocks,
}))
vi.mock('../../p-modal/PModal', () => ({
  PModal: (props: {
    readonly children: JSX.Element
    readonly footer?: JSX.Element
    readonly size?: string
  }) => (
    <section>
      {props.children}
      {props.footer}
    </section>
  ),
}))

import {PAlbumLibraryContent} from '../Content'

beforeEach(() => {
  audioMocks.loadBundledPAlbums.mockResolvedValue([])
  audioMocks.publishedAlbumCatalogQuery.mockImplementation((locale) =>
    audioMocks.loadPublishedPAlbums({locale}),
  )
  audioMocks.loadPublishedPAlbums.mockResolvedValue({
    albums: [
      {
        coverImageUrl: 'https://storage.pomofi.io/album.webp',
        description: '판매 준비 설명',
        icon: 'i-tabler-vinyl',
        id: 'paid-album-id',
        sale: {state: 'preparing', statusLabel: '판매 준비중'},
        title: '공개 앨범',
        trackCount: 9,
        trackIds: [],
        trackListings: [
          {artist: '첫 가수', id: 'paid-one', title: '첫 공개곡'},
          {artist: '둘째 가수', id: 'paid-two', title: '둘째 공개곡'},
          ...Array.from({length: 7}, (_, index) => ({
            artist: `${index + 3}번째 가수`,
            id: `paid-${index + 3}`,
            title: `${index + 3}번째 공개곡`,
          })),
        ],
        tracks: [],
      },
    ],
    status: 'ready',
  })
})

afterEach(() => {
  cleanup()
  audioMocks.loadBundledPAlbums.mockReset()
  audioMocks.loadPublishedPAlbums.mockReset()
  audioMocks.publishedAlbumCatalogQuery.mockReset()
  vi.restoreAllMocks()
})

it('should render all nine limited previews for an unconfigured published album', async () => {
  render(() => <PAlbumLibraryContent onAddTracks={vi.fn()} tracks={[]} />)

  const albumCard = await screen.findByRole('article')
  expect(within(albumCard).getByText('공개 앨범')).toBeVisible()
  expect(within(albumCard).queryByText('[미정]')).toBeNull()
  expect(within(albumCard).getByText('판매 준비중')).toBeVisible()
  expect(within(albumCard).getByText('첫 공개곡')).toBeVisible()
  expect(within(albumCard).getByText('첫 가수')).toBeVisible()
  expect(within(albumCard).getByText('둘째 공개곡')).toBeVisible()
  expect(within(albumCard).getByText('둘째 가수')).toBeVisible()
  expect(within(albumCard).getByText('9번째 공개곡')).toBeVisible()
  expect(within(albumCard).queryByRole('button', {name: /더 많은 곡/u})).toBeNull()
  expect(within(albumCard).queryByRole('button', {name: '앨범 모두 추가'})).toBeNull()
  expect(within(albumCard).queryByRole('button', {name: /플레이어에 추가/u})).toBeNull()

  expect(albumCard.parentElement).toHaveClass('2xl:grid-cols-2')
  const trackList = within(albumCard).getByRole('list', {name: '공개 앨범 수록곡'})
  expect(trackList).toHaveClass(
    '2xl:grid-cols-1',
    'overflow-y-auto',
    'max-h-[10.5rem]',
    'sm:max-h-[5.25rem]',
    '2xl:max-h-[10.5rem]',
  )
  expect(trackList.tabIndex).toBe(0)
  expect(within(trackList).getAllByRole('button', {name: /30초 미리듣기$/u})).toHaveLength(9)
})
