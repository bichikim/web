/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
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
vi.mock('../../PModal', () => ({
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

import {PAlbumLibraryContent} from '../Content'

beforeEach(() => {
  audioMocks.publishedAlbumCatalogQuery.mockImplementation((locale) =>
    audioMocks.loadPublishedPAlbums({locale}),
  )
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

  expect(await screen.findByText('공개 앨범')).toBeTruthy()
  expect(screen.queryByText('[미정]')).toBeNull()
  expect(screen.getByText('판매 준비중')).toBeTruthy()
  expect(screen.getByText('첫 공개곡')).toBeTruthy()
  expect(screen.getByText('첫 가수')).toBeTruthy()
  expect(screen.getByText('둘째 공개곡')).toBeTruthy()
  expect(screen.getByText('둘째 가수')).toBeTruthy()
  expect(screen.getByText('9번째 공개곡')).toBeTruthy()
  expect(screen.queryByRole('button', {name: /더 많은 곡/u})).toBeNull()
  expect(screen.queryByRole('button', {name: '앨범 모두 추가'})).toBeNull()
  expect(screen.queryByRole('button', {name: /플레이어에 추가/u})).toBeNull()
  const albumCard = screen.getByText('공개 앨범').closest('article')

  expect(albumCard?.parentElement?.classList.contains('2xl:grid-cols-2')).toBe(true)
  const trackList = screen.getByRole('list', {name: '공개 앨범 수록곡'})

  expect(trackList.classList.contains('2xl:grid-cols-1')).toBe(true)
  expect(trackList.classList.contains('overflow-y-auto')).toBe(true)
  expect(trackList.classList.contains('max-h-[10.5rem]')).toBe(true)
  expect(trackList.classList.contains('sm:max-h-[5.25rem]')).toBe(true)
  expect(trackList.classList.contains('2xl:max-h-[10.5rem]')).toBe(true)
  expect(trackList.tabIndex).toBe(0)

  expect(screen.getAllByRole('button', {name: /30초 미리듣기$/u})).toHaveLength(9)
})
