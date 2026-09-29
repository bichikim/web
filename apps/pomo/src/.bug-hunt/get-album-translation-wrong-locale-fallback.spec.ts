/** @vitest-environment node */
import {expect, it} from 'vitest'

import {type AdminAlbum, getAlbumTranslation} from '../features/admin-music/catalog'

const albumWithEnglishOnly = {
  coverFallback: 'music',
  coverImageUrl: null,
  id: 'album-1',
  release: {blockers: [], ready: false},
  status: 'draft',
  translations: [
    {
      albumId: 'album-1',
      description: 'English description',
      locale: 'en',
      title: 'English title',
    },
  ],
} satisfies AdminAlbum

it('should not return another locale when the requested album translation is missing', () => {
  expect(getAlbumTranslation(albumWithEnglishOnly, 'ko')).toBeUndefined()
})
