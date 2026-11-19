import {render, screen} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import * as m from '@paraglide/message'
import type {CustomAlbumTrack} from '../../../features/custom-albums/model'
import {CustomAlbumTrackList} from '../CustomAlbumTrackList'

const TRACK_SIZE_BYTES = 1_572_864

it('should retain the native remove button while its controlled state changes', async () => {
  const track: CustomAlbumTrack = {
    audio: new Blob([new Uint8Array(TRACK_SIZE_BYTES)]),
    durationSeconds: 125,
    fileName: 'rain.mp3',
    id: 'rain-track',
    title: 'Rain',
  }
  const [tracks, setTracks] = createSignal<readonly CustomAlbumTrack[]>([track])
  const [disabled, setDisabled] = createSignal(true)
  const onRemove = vi.fn()
  render(() =>
    createComponent(CustomAlbumTrackList, {
      get disabled() {
        return disabled()
      },
      onRemove,
      get tracks() {
        return tracks()
      },
    }),
  )
  const button = screen.getByRole('button', {name: m.album_custom_remove()})
  expect(button).toBeDisabled()
  button.click()
  expect(onRemove).not.toHaveBeenCalled()
  expect(screen.getByText('1. Rain')).toBeVisible()
  expect(
    screen.getByText(`${m.album_custom_track_duration({minutes: 2, seconds: '05'})} · 1.5 MB`),
  ).toBeVisible()

  setDisabled(false)
  expect(screen.getByRole('button', {name: m.album_custom_remove()})).toBe(button)
  await userEvent.tab()
  expect(button).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  expect(onRemove).toHaveBeenCalledExactlyOnceWith('rain-track')
  expect(screen.getByRole('list')).toBeVisible()
  setTracks([])
  expect(screen.queryByRole('list')).toBeNull()
  expect(screen.getByText(m.album_custom_no_tracks())).toBeVisible()
})
