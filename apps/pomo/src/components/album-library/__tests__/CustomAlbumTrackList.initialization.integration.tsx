/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {memoizeAsync} from 'src/utils/memoize-async'
import type {CustomAlbumTrack} from 'src/features/custom-albums'
import {CustomAlbumTrackList} from '../CustomAlbumTrackList'

vi.mock('src/utils/memoize-async', () => ({memoizeAsync: vi.fn()}))

// Preserve cold calls before per-test mock cleanup.
const initializersDuringImport = vi.mocked(memoizeAsync).mock.calls.length

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should display caller-owned tracks and remove requests without initializing database memoizers', () => {
  const track: CustomAlbumTrack = {
    audio: new Blob([new Uint8Array(1_572_864)]),
    durationSeconds: 125,
    fileName: 'rain.mp3',
    id: 'rain-track',
    title: 'Rain',
  }
  const [tracks, setTracks] = createSignal<readonly CustomAlbumTrack[]>([track])
  const [disabled, setDisabled] = createSignal(false)
  const onRemove = vi.fn()
  render(() => <CustomAlbumTrackList disabled={disabled()} onRemove={onRemove} tracks={tracks()} />)
  const button = screen.getByRole('button', {name: m.album_custom_remove()})
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  expect(screen.getByText('1. Rain')).toBeVisible()
  expect(
    screen.getByText(`${m.album_custom_track_duration({minutes: 2, seconds: '05'})} · 1.5 MB`),
  ).toBeVisible()

  setDisabled(true)
  expect(button).toBeDisabled()
  button.click()
  expect(onRemove).not.toHaveBeenCalled()
  setDisabled(false)
  expect(screen.getByRole('button', {name: m.album_custom_remove()})).toBe(button)
  fireEvent.click(button)
  expect(onRemove).toHaveBeenCalledExactlyOnceWith('rain-track')
  expect(screen.getByRole('list')).toBeVisible()
  setTracks([])
  expect(screen.queryByRole('list')).toBeNull()
  expect(screen.getByText(m.album_custom_no_tracks())).toBeVisible()

  expect(initializersDuringImport).toBe(0)
  expect(memoizeAsync).not.toHaveBeenCalled()
})
