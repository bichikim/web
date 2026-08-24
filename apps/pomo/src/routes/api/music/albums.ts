import {listPublishedAlbums, type PublishedAlbumLocale} from 'src/server/music/catalog-repository'

const HTTP_INTERNAL_SERVER_ERROR = 500

const getLocale = (request: Request): PublishedAlbumLocale =>
  new URL(request.url).searchParams.get('locale') === 'en' ? 'en' : 'ko'

export const GET = async ({request}: {readonly request: Request}): Promise<Response> => {
  try {
    return Response.json(
      {albums: await listPublishedAlbums(getLocale(request)), version: 1},
      {headers: {'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'}},
    )
  } catch (error) {
    console.error('Failed to list published music albums', error)
    return Response.json(
      {error: 'music_catalog_failed'},
      {headers: {'Cache-Control': 'no-store'}, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }
}
