/** @vitest-environment jsdom */

import {cleanup, fireEvent, screen, waitFor} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'

import {catalogWithAlbum, coverImageMocks, renderAdminMusic} from './fixtures/admin-music'

describe('AdminMusic', () => {
  it('should warn about the public catalog and R2 before deleting a published track', async () => {
    const publishedCatalog = {
      ...catalogWithAlbum,
      albums: [{...catalogWithAlbum.albums[0], status: 'published'}],
      assets: [{id: 'asset-id', status: 'active', trackId: 'track-id'}],
      tracks: [{albumId: 'album-id', artist: 'Pomo', id: 'track-id', position: 0, title: '첫 곡'}],
    } as const
    const fetcher = vi.fn<typeof fetch>(async (input, options) => {
      if (options?.method === 'DELETE') {
        return Response.json({success: true})
      }

      return Response.json(publishedCatalog)
    })
    vi.stubGlobal('fetch', fetcher)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderAdminMusic()

    fireEvent.click(await screen.findByRole('button', {name: '첫 곡 수록곡 삭제'}))

    expect(window.confirm).toHaveBeenCalledWith(
      '‘첫 곡’을 삭제할까요?\n현재 공개 중인 앨범에서도 즉시 사라지며, R2의 MP3 파일도 영구 삭제됩니다.',
    )
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledWith('/api/admin/music/tracks/track-id', {method: 'DELETE'})
    })
  })

  it('should retry the catalog from the completion notice without deleting the track again', async () => {
    const catalog = {
      ...catalogWithAlbum,
      assets: [{id: 'asset-id', status: 'active', trackId: 'track-id'}],
      tracks: [{albumId: 'album-id', artist: 'Pomo', id: 'track-id', position: 0, title: '첫 곡'}],
    }
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(catalog))
      .mockResolvedValueOnce(Response.json({success: true}))
      .mockResolvedValueOnce(new Response(null, {status: 500}))
      .mockResolvedValueOnce(Response.json(catalogWithAlbum))
    vi.stubGlobal('fetch', fetcher)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderAdminMusic()

    fireEvent.click(await screen.findByRole('button', {name: '첫 곡 수록곡 삭제'}))

    expect(await screen.findByRole('status')).toHaveTextContent(
      '수록곡과 MP3 파일을 삭제했습니다. 목록을 새로고침하지 못했습니다.',
    )
    fireEvent.click(screen.getByRole('button', {name: '목록 새로고침'}))

    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(screen.queryByRole('button', {name: '첫 곡 수록곡 삭제'})).toBeNull()
    expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(1)
    expect(fetcher).toHaveBeenCalledTimes(4)
  })
})
