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
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
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
