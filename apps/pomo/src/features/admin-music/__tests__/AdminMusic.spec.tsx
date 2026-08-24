/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const startMocks = vi.hoisted(() => ({clientOnly: vi.fn(() => vi.fn(() => null))}))

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('@solidjs/start', () => startMocks)

import {AdminMusic} from '../AdminMusic'
import {createEmptyAlbumTranslations} from '../album-draft'
import {writeAlbumDraftData} from '../album-draft-storage'

const catalogWithAlbum = {
  albums: [
    {
      coverFallback: 'lp',
      coverImageUrl: null,
      id: 'album-id',
      release: {blockers: [], ready: true},
      status: 'draft',
      translations: [
        {
          albumId: 'album-id',
          description: '앨범 설명',
          locale: 'ko',
          title: '첫 앨범',
        },
      ],
    },
  ],
  assets: [],
  offers: [],
  tracks: [],
} as const

beforeEach(() => {
  vi.mocked(Title).mockImplementation(() => null)
  vi.mocked(A).mockImplementation((props) => <a href={props.href}>{props.children}</a>)
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.unstubAllGlobals()
})

describe('AdminMusic', () => {
  it('should only ask for the Apps in Toss SKU when connecting a product', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(catalogWithAlbum)))
    render(() => <AdminMusic />)

    fireEvent.click(await screen.findByRole('tab', {name: '판매 및 공개'}))

    expect(screen.getByText('앱인토스 상품 ID (SKU)')).toBeTruthy()
    expect(screen.queryByText('내부 상품 코드')).toBeNull()
  })

  it('should provide an album cover file upload with its accepted formats', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({albums: [], assets: [], offers: [], tracks: []})),
    )
    render(() => <AdminMusic />)

    const coverInput = await screen.findByLabelText(/^이미지 파일/u)

    expect(coverInput.getAttribute('type')).toBe('file')
    expect(coverInput.getAttribute('accept')).toBe('image/jpeg,image/png,image/webp')
    expect(screen.getByText(/중앙 정사각형 크롭 · 1200×1200 WebP/u)).toBeTruthy()
  })

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

      return Response.json({albums: [], assets: [], offers: [], tracks: []})
    })
    vi.stubGlobal('fetch', fetcher)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(() => <AdminMusic />)

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

        return Response.json({albums: [], assets: [], offers: [], tracks: []})
      }),
    )
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(() => <AdminMusic />)

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

  it('should organize selected album work into focused tabs', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(catalogWithAlbum)))
    render(() => <AdminMusic />)

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

  it('should review zero tracks and pending sales before publishing', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(catalogWithAlbum)))
    render(() => <AdminMusic />)

    fireEvent.click(await screen.findByRole('button', {name: '공개 설정'}))

    expect(screen.getByRole('tab', {name: '판매 및 공개'}).getAttribute('aria-selected')).toBe(
      'true',
    )
    expect(screen.getByRole('heading', {name: '이 앨범을 공개할까요?'})).toBeTruthy()
    expect(
      screen.getByText('수록곡이 없어도 공개됩니다. 상품이 없으면 가격을 표시하지 않습니다.'),
    ).toBeTruthy()
  })

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
    render(() => <AdminMusic />)

    fireEvent.click(await screen.findByRole('button', {name: '첫 곡 수록곡 삭제'}))

    expect(window.confirm).toHaveBeenCalledWith(
      '‘첫 곡’을 삭제할까요?\n현재 공개 중인 앨범에서도 즉시 사라지며, R2의 MP3 파일도 영구 삭제됩니다.',
    )
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledWith('/api/admin/music/tracks/track-id', {method: 'DELETE'})
    })
  })
})
