import {query} from '@solidjs/router'
import type {Locale} from '@paraglide/runtime'

import {loadPublishedPAlbums} from './focus-room-playlist/published-catalog'

const requestPublishedAlbumCatalog = (locale: Locale) => loadPublishedPAlbums({locale})

export const publishedAlbumCatalogQuery = query(
  requestPublishedAlbumCatalog,
  'published-focus-room-album-catalog',
)
