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
const modalMocks = vi.hoisted(() => ({render: vi.fn()}))

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
  }) => {
    modalMocks.render(props)
    return (
      <section>
        {props.children}
        {props.footer}
      </section>
    )
  },
}))
vi.mock('../TrackList', () => ({PAlbumTrackList: vi.fn()}))

import {PAlbumLibraryContent} from '../Content'
import {PAlbumTrackList} from '../TrackList'

beforeEach(() => {
  audioMocks.publishedAlbumCatalogQuery.mockImplementation((locale) =>
    audioMocks.loadPublishedPAlbums({locale}),
  )
  vi.mocked(PAlbumTrackList).mockImplementation((props) => (
    <ol aria-label={`${props.albumTitle} 수록곡`} tabIndex={0} />
  ))
})

afterEach(() => {
  cleanup()
  audioMocks.loadBundledPAlbums.mockReset()
  audioMocks.loadPublishedPAlbums.mockReset()
  audioMocks.publishedAlbumCatalogQuery.mockReset()
  modalMocks.render.mockClear()
  vi.restoreAllMocks()
})

it('should show an unconfigured published album as sale preparation', async () => {
  audioMocks.loadBundledPAlbums.mockResolvedValue([])
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

  render(() => <PAlbumLibraryContent onAddTracks={vi.fn()} tracks={[]} />)

  const albumCard = await screen.findByRole('article')
  expect(within(albumCard).getByText('공개 앨범')).toBeVisible()
  expect(within(albumCard).queryByText('[미정]')).toBeNull()
  expect(within(albumCard).getByText('판매 준비중')).toBeVisible()
  expect(within(albumCard).queryByRole('button', {name: /더 많은 곡/u})).toBeNull()
  expect(within(albumCard).queryByRole('button', {name: '앨범 모두 추가'})).toBeNull()
  expect(within(albumCard).queryByRole('button', {name: /플레이어에 추가/u})).toBeNull()

  expect(albumCard?.parentElement?.classList.contains('2xl:grid-cols-2')).toBe(true)
  const trackList = within(albumCard).getByRole('list', {name: '공개 앨범 수록곡'})
  const trackListProps = vi.mocked(PAlbumTrackList).mock.calls[0]?.[0]

  expect(trackList.tabIndex).toBe(0)
  expect(trackListProps?.tracks.map(({artist, id, title}) => [id, title, artist])).toEqual([
    ['paid-one', '첫 공개곡', '첫 가수'],
    ['paid-two', '둘째 공개곡', '둘째 가수'],
    ['paid-3', '3번째 공개곡', '3번째 가수'],
    ['paid-4', '4번째 공개곡', '4번째 가수'],
    ['paid-5', '5번째 공개곡', '5번째 가수'],
    ['paid-6', '6번째 공개곡', '6번째 가수'],
    ['paid-7', '7번째 공개곡', '7번째 가수'],
    ['paid-8', '8번째 공개곡', '8번째 가수'],
    ['paid-9', '9번째 공개곡', '9번째 가수'],
  ])
  expect(trackListProps?.playableTracks).toEqual([])
})
