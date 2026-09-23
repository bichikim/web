/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {BASE_CATALOG, createModelHarness} from '../../__tests__/fixtures/model'
import {TrackPanel} from '../TrackPanel'
vi.mock('@solidjs/start', () => ({clientOnly: vi.fn(() => () => null)}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should count active tracks and require confirmation before removal', async () => {
  const {model} = createModelHarness()
  const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
  render(() => (
    <TrackPanel
      albumId="album"
      albumTitle="앨범"
      model={model}
      albumStatus="published"
      assets={BASE_CATALOG.assets}
      pendingTracks={[]}
      tracks={BASE_CATALOG.tracks.filter((track) => track.albumId === 'album')}
    />
  ))
  expect(screen.getByRole('heading', {name: '수록곡 2'})).toBeVisible()
  expect(screen.queryByText('Hidden track')).not.toBeInTheDocument()
  const button = screen.getByRole('button', {name: 'Track one 수록곡 삭제'})
  fireEvent.click(button)
  expect(model.handleTrackRemove).not.toHaveBeenCalled()
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('현재 공개 중인 앨범'))
  confirm.mockReturnValue(true)
  fireEvent.click(button)
  await waitFor(() => expect(model.handleTrackRemove).toHaveBeenCalledWith('one'))
})

it('should show each active track artwork without using an inactive asset image', () => {
  const {model} = createModelHarness()
  render(() => (
    <TrackPanel
      albumId="album"
      albumTitle="앨범"
      albumStatus="draft"
      model={model}
      pendingTracks={[]}
      tracks={BASE_CATALOG.tracks.filter((track) => track.albumId === 'album')}
      assets={[
        {
          artworkUrl: 'https://images.example/old.png',

          id: 'old',
          status: 'retired',
          trackId: 'one',
        },
        {
          artworkUrl: 'https://images.example/one.png',

          id: 'first',
          status: 'active',
          trackId: 'one',
        },
        {
          artworkUrl: 'https://images.example/two.png',

          id: 'second',
          status: 'active',
          trackId: 'two',
        },
      ]}
    />
  ))
  expect(screen.getByRole('img', {name: 'Track one 곡 이미지'})).toHaveAttribute(
    'src',
    'https://images.example/one.png',
  )
  expect(screen.getByRole('img', {name: 'Track two 곡 이미지'})).toHaveAttribute(
    'src',
    'https://images.example/two.png',
  )
  expect(screen.getAllByRole('img')).toHaveLength(2)
})
