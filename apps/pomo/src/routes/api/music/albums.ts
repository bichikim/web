import {listPublishedAlbums} from 'src/server/music/catalog-repository'

const HTTP_INTERNAL_SERVER_ERROR = 500

export const GET = async (): Promise<Response> => {
  try {
    return Response.json(
      {albums: await listPublishedAlbums(), version: 1},
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
