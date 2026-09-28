import {isUserRequestResolutionError} from 'src/server/auth/user-request-resolution-error'
import {resolveUserRequest} from 'src/server/auth/resolve-user-request'
import {noStoreJson} from 'src/server/http/response'
import {
  listOwnedAlbums,
  type OwnedAlbum,
  type PublishedAlbumLocale,
} from 'src/server/repositories/music-catalog'

const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_UNAUTHORIZED = 401

const getLocale = (request: Request): PublishedAlbumLocale =>
  new URL(request.url).searchParams.get('locale') === 'en' ? 'en' : 'ko'

const toOwnedAlbumResponse = (album: OwnedAlbum) => ({
  coverFallback: album.coverFallback,
  coverImageUrl: album.coverImageUrl,
  description: album.description,
  id: album.id,
  productId: album.productId,
  title: album.title,
  trackCount: album.trackCount,
  tracks: album.tracks,
})

export const GET = async (event: {readonly request: Request}): Promise<Response> => {
  let identity: Awaited<ReturnType<typeof resolveUserRequest>>
  try {
    identity = await resolveUserRequest(event.request)
  } catch (error: unknown) {
    if (!isUserRequestResolutionError(error)) {
      throw error
    }

    console.error('Failed to resolve owned music catalog user', error.cause)
    return noStoreJson(
      {error: 'music_catalog_unavailable'},
      {cookies: error.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }

  if (identity.access === 'invalid') {
    return noStoreJson(
      {error: 'authentication_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }

  if (identity.userId === null) {
    return noStoreJson(
      {error: 'unauthorized'},
      {cookies: identity.cookies, status: HTTP_UNAUTHORIZED},
    )
  }

  try {
    const albums = await listOwnedAlbums(identity.userId, getLocale(event.request))
    return noStoreJson(
      {albums: albums.map(toOwnedAlbumResponse), version: 1},
      {cookies: identity.cookies},
    )
  } catch (error: unknown) {
    console.error('Failed to list owned music albums', error)
    return noStoreJson(
      {error: 'music_catalog_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
