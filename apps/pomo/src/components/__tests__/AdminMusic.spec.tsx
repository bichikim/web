/** @vitest-environment jsdom */

import {cleanup, fireEvent, screen, waitFor} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'

import {catalogWithAlbum, coverImageMocks, renderAdminMusic} from './fixtures/admin-music'

describe('AdminMusic', () => {
  it('should organize selected album work into focused tabs', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(catalogWithAlbum)))
    renderAdminMusic()

    expect(await screen.findByRole('heading', {name: '첫 앨범'})).toBeTruthy()
    expect(screen.queryByLabelText('앨범 선택')).toBeNull()
    expect(screen.getByRole('button', {name: '+ 새 앨범 만들기'})).toBeTruthy()
    expect(screen.getByRole('tab', {name: '수록곡 0'}).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('아직 수록곡이 없습니다.')).toBeTruthy()
    expect(screen.queryByLabelText(/^MP3 파일/u)).toBeNull()

    fireEvent.click(screen.getByRole('button', {name: '+ 곡 추가'}))

    const audioInput = screen.getByLabelText(/^MP3 파일/u)
    expect(audioInput.getAttribute('type')).toBe('file')
    expect(audioInput.hasAttribute('required')).toBe(true)
  })

  it('should report HTTP and unknown catalog loading failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 500})),
    )
    renderAdminMusic()

    expect(await screen.findByText('음악 목록을 불러오지 못했습니다.')).toBeTruthy()

    cleanup()
    vi.mocked(fetch).mockRejectedValueOnce('network unavailable')
    renderAdminMusic()

    expect(await screen.findByText('음악 목록을 불러오지 못했습니다.')).toBeTruthy()
  })

  it('should navigate albums and render cover, fallback, status, and active-track variants', async () => {
    const catalog = {
      albums: [
        {
          ...catalogWithAlbum.albums[0],
          coverImageUrl: 'https://example.com/cover.webp',
          status: 'published',
        },
        {
          coverFallback: 'music',
          coverImageUrl: null,
          id: 'archived-album',
          release: {blockers: [], ready: true},
          status: 'archived',
          translations: [],
        },
      ],
      assets: [
        {id: 'active-asset', status: 'active', trackId: 'track-id'},
        {id: 'inactive-asset', status: 'pending', trackId: 'track-id'},
        {id: 'foreign-asset', status: 'active', trackId: 'foreign-track'},
      ],
      offers: [],
      pendingTracks: [],
      tracks: [
        {albumId: 'album-id', artist: 'Pomo', id: 'track-id', position: 0, title: '첫 곡'},
        {
          albumId: 'archived-album',
          artist: 'Pomo',
          id: 'archived-track',
          position: 0,
          title: '보관 곡',
        },
      ],
    } as const
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(catalog)))
    renderAdminMusic()

    await screen.findByText('제목 없음')
    expect(document.querySelector('nav img')?.getAttribute('src')).toBe(
      'https://example.com/cover.webp',
    )
    expect(screen.getByText('♪')).toBeTruthy()
    expect(screen.getByText('제목 없음')).toBeTruthy()
    expect(screen.getByText('보관')).toBeTruthy()
    expect(screen.getByText('1곡')).toBeTruthy()
    expect(screen.getByText('0곡')).toBeTruthy()

    const archivedAlbumButton = screen.getByRole('button', {name: /제목 없음/u})
    expect(archivedAlbumButton.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(archivedAlbumButton)
    expect(archivedAlbumButton.getAttribute('aria-pressed')).toBe('true')

    const editorButton = screen.getByRole('button', {name: '+ 새 앨범 만들기'})
    fireEvent.click(editorButton)
    expect(screen.getByRole('button', {name: '작성 화면 닫기'})).toBeTruthy()
    fireEvent.click(screen.getByRole('button', {name: '작성 화면 닫기'}))
    expect(screen.getByRole('button', {name: '+ 새 앨범 만들기'})).toBeTruthy()
  })
})
