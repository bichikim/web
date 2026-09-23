/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {AlbumNavigation} from '../AlbumNavigation'
import {createAlbum} from './fixtures/model'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should mark the selected album and forward album selection', () => {
  const album = createAlbum()
  const onAlbumSelect = vi.fn()
  render(() => (
    <AlbumNavigation
      albums={[album]}
      onAlbumSelect={onAlbumSelect}
      selectedAlbumId={album.id}
      trackCount={() => 3}
    />
  ))
  const button = screen.getByRole('button')
  expect(button).toHaveAttribute('aria-pressed', 'true')
  expect(button).toHaveTextContent('한국어 앨범')
  expect(button).toHaveTextContent('3곡')
  fireEvent.click(button)
  expect(onAlbumSelect).toHaveBeenCalledWith(album.id)
})
