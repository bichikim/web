/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'
import type {PResolvedAlbum} from 'src/features/focus-room-audio'
import {AlbumSummary} from '../Summary'

const album: PResolvedAlbum = {
  coverImageUrl: 'https://example.com/unavailable.webp',
  description: '',
  icon: 'i-tabler-vinyl',
  id: 'album-1',
  title: 'Rainy Afternoon',
  trackIds: [],
  tracks: [],
}

it('should replace a failed remote cover with the album type icon', () => {
  const {container} = render(() => <AlbumSummary album={album} index={0} />)

  fireEvent.error(screen.getByRole('img'))

  expect(screen.queryByRole('img')).toBeNull()
  expect(container.querySelector('.i-tabler-vinyl')).toBeVisible()
})
