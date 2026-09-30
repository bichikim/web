/** @vitest-environment jsdom */

import 'fake-indexeddb/auto'

import {createMemoryHistory, MemoryRouter, Route} from '@solidjs/router'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {createEmptyAlbumTranslations} from 'src/features/admin-music'
import {writeAlbumDraftData} from 'src/features/admin-music/album-draft-storage'
import {catalogWithAlbum} from '../../__tests__/fixtures/admin-music'
import {AdminMusic} from '../AdminMusic'

const imports = vi.hoisted(() => ({createTrackWithAudio: vi.fn(), removeTrack: vi.fn()}))
vi.mock('src/features/admin-music/track-creation', () => imports)
vi.mock('src/features/admin-music/track-metadata', () => ({
  readTrackMetadata: async (file: File) => ({artist: 'Artist', title: file.name}),
}))

const setup = async () => {
  const first = Promise.withResolvers<{success: true}>()
  imports.createTrackWithAudio
    .mockReset()
    .mockReturnValueOnce(first.promise)
    .mockResolvedValue({success: true})
  const catalog = {
    ...catalogWithAlbum,
    albums: [
      catalogWithAlbum.albums[0],
      {
        ...catalogWithAlbum.albums[0],
        id: 'second-album',
        translations: [
          {albumId: 'second-album', description: '', locale: 'ko', title: '둘째 앨범'},
        ],
      },
    ],
  }
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(catalog))
  vi.stubGlobal('fetch', fetcher)
  const history = createMemoryHistory()
  history.set({value: '/admin/music'})
  render(() => (
    <MemoryRouter history={history}>
      <Route path="/admin/music" component={AdminMusic} />
      <Route path="/admin" component={() => <h1>관리자 홈 도착</h1>} />
    </MemoryRouter>
  ))
  await screen.findByRole('heading', {name: '첫 앨범'})
  fireEvent.click(screen.getByRole('button', {name: '+ 곡 추가'}))
  fireEvent.change(screen.getByLabelText(/^MP3 파일 여러/u), {
    target: {files: [new File(['one'], 'one.mp3'), new File(['two'], 'two.mp3')]},
  })
  await waitFor(() => expect(screen.getByRole('button', {name: '2곡 추가'})).toBeEnabled())
  fetcher.mockClear()
  fireEvent.submit(screen.getByRole('form', {name: '곡 추가'}))
  await waitFor(() => expect(imports.createTrackWithAudio).toHaveBeenCalledTimes(1))
  return {catalog, fetcher, first, history}
}

it('should retain the queue across workspace controls and refresh the catalog only after the batch', async () => {
  const {first, fetcher} = await setup()
  fireEvent.submit(screen.getByRole('form', {name: '곡 추가'}))
  expect(imports.createTrackWithAudio).toHaveBeenCalledTimes(1)
  const controls = [
    screen.getByRole('button', {name: /둘째 앨범/u}),
    screen.getByRole('button', {name: '추가 화면 닫기'}),
    screen.getByRole('button', {name: '공개 설정'}),
    screen.getByRole('tab', {name: '기본 정보'}),
  ]
  for (const control of controls) {
    expect(control).toBeDisabled()
    fireEvent.click(control)
  }
  fireEvent.click(screen.getByRole('button', {name: '+ 새 앨범 만들기'}))
  expect(screen.getByRole('region', {name: '새 앨범 만들기'})).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '작성 화면 닫기'}))
  expect(screen.getByRole('group', {name: 'two.mp3'})).toBeInTheDocument()
  expect(fetcher).not.toHaveBeenCalled()
  const refresh = Promise.withResolvers<Response>()
  fetcher.mockReturnValueOnce(refresh.promise)
  first.resolve({success: true})
  try {
    await screen.findByText('등록 완료 2곡 · 등록 실패 0곡 · 상태 확인 필요 0곡')
    await waitFor(() =>
      expect(fetcher.mock.calls.map(([input]) => String(input))).toEqual(['/api/admin/music']),
    )
    expect(screen.getByRole('button', {name: '추가 화면 닫기'})).toBeDisabled()
    expect(screen.getByLabelText(/^MP3 파일 여러/u)).toBeDisabled()
    expect(screen.getByRole('button', {name: '닫기'})).toBeDisabled()
    fireEvent.drop(screen.getByRole('group', {name: '파일 드롭 영역'}), {
      dataTransfer: {files: [new File(['third'], 'third.mp3')]},
    })
    expect(screen.queryByRole('group', {name: 'third.mp3'})).toBeNull()
  } finally {
    refresh.resolve(Response.json(catalogWithAlbum))
  }
  await waitFor(() => expect(screen.getByRole('button', {name: '추가 화면 닫기'})).toBeEnabled())
})
