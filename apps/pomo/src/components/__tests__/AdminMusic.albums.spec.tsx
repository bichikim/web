/** @vitest-environment jsdom */

import {cleanup, fireEvent, screen, waitFor} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'

import {createEmptyAlbumTranslations} from '../../features/admin-music'
import {writeAlbumDraftData} from '../../features/admin-music/album-draft-storage'
import {catalogWithAlbum, coverImageMocks, renderAdminMusic} from './fixtures/admin-music'

describe('AdminMusic', () => {
  it('should restore an album session draft and remove it after album creation', async () => {
    writeAlbumDraftData({
      coverDraftId: null,
      coverFallback: 'cd',
      coverImageUrl: 'https://storage.pomofi.io/draft-cover.webp',
      hasCoverFile: false,
      translations: {
        ...createEmptyAlbumTranslations(),
        ko: {description: '작성 중이던 설명', title: '작성 중이던 제목'},
      },
    })
    const fetcher = vi.fn<typeof fetch>(async (input, options) => {
      const url = input instanceof Request ? input.url : input.toString()

      if (url.endsWith('/api/admin/music/albums') && options?.method === 'POST') {
        return Response.json({id: 'album-id'}, {status: 201})
      }

      return Response.json({albums: [], assets: [], offers: [], pendingTracks: [], tracks: []})
    })
    vi.stubGlobal('fetch', fetcher)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    renderAdminMusic()

    expect(
      await screen.findByDisplayValue('https://storage.pomofi.io/draft-cover.webp'),
    ).toBeTruthy()
    expect((screen.getByLabelText('이미지가 없을 때') as HTMLSelectElement).value).toBe('cd')
    expect(screen.getByText('작성 중이던 앨범 초안을 복원했습니다.')).toBeTruthy()

    const albumForm = screen.getByRole('button', {name: '앨범 초안 만들기'}).closest('form')

    if (albumForm === null) {
      throw new Error('앨범 초안 폼을 찾지 못했습니다.')
    }

    fireEvent.submit(albumForm)

    await waitFor(() => {
      expect(sessionStorage.getItem('pomo:admin-music:album-draft:v1')).toBeNull()
    })
    expect(fetcher).toHaveBeenCalledWith(
      '/api/admin/music/albums',
      expect.objectContaining({method: 'POST'}),
    )
  })

  it('should retain the album session draft when album creation fails', async () => {
    writeAlbumDraftData({
      coverDraftId: null,
      coverFallback: 'lp',
      coverImageUrl: '',
      hasCoverFile: false,
      translations: {
        ...createEmptyAlbumTranslations(),
        ko: {description: '다시 시도할 설명', title: '다시 시도할 제목'},
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (input, options) => {
        const url = input instanceof Request ? input.url : input.toString()

        if (url.endsWith('/api/admin/music/albums') && options?.method === 'POST') {
          return Response.json({message: 'failed'}, {status: 500})
        }

        return Response.json({albums: [], assets: [], offers: [], pendingTracks: [], tracks: []})
      }),
    )
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    renderAdminMusic()

    expect(await screen.findByText('작성 중이던 앨범 초안을 복원했습니다.')).toBeTruthy()
    const albumForm = screen.getByRole('button', {name: '앨범 초안 만들기'}).closest('form')

    if (albumForm === null) {
      throw new Error('앨범 초안 폼을 찾지 못했습니다.')
    }

    fireEvent.submit(albumForm)

    expect(
      await screen.findByText('저장하지 못했습니다. 입력값과 로그인 상태를 확인해 주세요.'),
    ).toBeTruthy()
    expect(sessionStorage.getItem('pomo:admin-music:album-draft:v1')).not.toBeNull()
  })

  it('should show the saving state while album creation is pending', async () => {
    let resolveCreation: (response: Response) => void = () => undefined
    const creation = new Promise<Response>((resolve) => {
      resolveCreation = resolve
    })
    const fetcher = vi.fn<typeof fetch>(async (input, options) => {
      if (options?.method === 'POST') {
        return creation
      }

      return Response.json({albums: [], assets: [], offers: [], pendingTracks: [], tracks: []})
    })
    vi.stubGlobal('fetch', fetcher)
    renderAdminMusic()
    const submitButton = await screen.findByRole('button', {name: '앨범 초안 만들기'})
    const form = submitButton.closest('form')

    if (form === null) {
      throw new Error('앨범 초안 폼을 찾지 못했습니다.')
    }

    fireEvent.submit(form)
    expect(await screen.findByRole('button', {name: '커버 업로드 및 저장 중…'})).toBeDisabled()
    resolveCreation(Response.json({id: 'album-id'}, {status: 201}))
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3))
  })
})
