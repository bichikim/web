import * as m from '@paraglide/message'

import {CustomAlbumError} from '../../features/custom-albums'

export const getCustomAlbumErrorMessage = (error: unknown): string => {
  if (!(error instanceof CustomAlbumError)) {
    return m.album_custom_error_save()
  }

  switch (error.code) {
    case 'album-missing':
      return m.album_custom_error_not_found()
    case 'album-too-large':
      return m.album_custom_error_album_too_large()
    case 'cover-too-large':
      return m.album_custom_error_cover_too_large()
    case 'corrupt-data':
    case 'database-unavailable':
      return m.album_custom_error_storage()
    case 'invalid-audio':
      return m.album_custom_error_duration()
    case 'invalid-album':
      return m.album_custom_error_invalid()
    case 'invalid-cover':
      return m.album_custom_error_cover_invalid()
    case 'library-too-large':
      return m.album_custom_error_library_too_large()
    case 'quota-exceeded':
      return m.album_custom_error_quota()
    case 'track-too-large':
      return m.album_custom_error_track_too_large()
  }

  error.code satisfies never
  return m.album_custom_error_save()
}
