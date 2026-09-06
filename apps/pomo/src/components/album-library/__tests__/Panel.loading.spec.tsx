/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal, type JSX, Suspense} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PTrack} from '../../../features/focus-room-audio'

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

import {PAlbumLibraryPanel} from '../Panel'

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

it('should render the album modal and local loading status before album content resolves', () => {
  const pendingAlbums = new Promise<never>(() => {
    // Keep the request pending so the loading presentation can be asserted.
  })
  audioMocks.loadBundledPAlbums.mockReturnValue(pendingAlbums)
  audioMocks.loadPublishedPAlbums.mockResolvedValue({albums: [], status: 'ready'})

  render(() => (
    <Suspense fallback={<p>장면 준비 중</p>}>
      <PAlbumLibraryPanel
        isOpen
        onAddTracks={vi.fn()}
        onCloseAutoFocus={vi.fn()}
        onOpenChange={vi.fn()}
        tracks={[]}
      />
    </Suspense>
  ))

  expect(modalMocks.render).toHaveBeenCalled()
  expect(modalMocks.render.mock.lastCall?.[0].size).toBe('full')
  expect(screen.getByRole('status')).toHaveTextContent('앨범 불러오는 중')
  expect(screen.queryByText('장면 준비 중')).toBeNull()
})
it('should clear and restore the current player tracks from the modal footer', async () => {
  audioMocks.loadBundledPAlbums.mockResolvedValue([])
  audioMocks.loadPublishedPAlbums.mockResolvedValue({albums: [], status: 'ready'})
  const initialTracks = [
    {
      artist: '가수',
      durationSeconds: 180,
      id: 'track-one',
      source: '/track-one.mp3',
      title: '첫 곡',
    },
  ]
  const [tracks, setTracks] = createSignal<readonly PTrack[]>(initialTracks)

  render(() => (
    <PAlbumLibraryPanel
      isOpen
      onAddTracks={(tracksToAdd) => setTracks(tracksToAdd)}
      onClearTracks={() => setTracks([])}
      onCloseAutoFocus={vi.fn()}
      onOpenChange={vi.fn()}
      tracks={tracks()}
    />
  ))

  expect(screen.getByText('현재 재생목록')).toBeTruthy()
  expect(screen.getByText('1곡')).toBeTruthy()
  screen.getByRole('button', {name: '재생목록 모두 비우기'}).click()

  const clearedStatus = screen.getByText('재생목록을 비웠어요').closest('[role="status"]')

  expect(clearedStatus).toHaveTextContent('재생목록을 비웠어요')
  screen.getByRole('button', {name: '되돌리기'}).click()

  expect(tracks()).toEqual(initialTracks)
  expect(screen.getByRole('button', {name: '재생목록 모두 비우기'})).toBeTruthy()
})
