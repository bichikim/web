/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

interface ClientOnlyStubProps {
  readonly fallback?: unknown
  readonly onValuesChange?: (values: unknown) => void
  readonly values?: unknown
}

const startMocks = vi.hoisted(() => ({
  clientOnly: vi.fn((loader: () => Promise<unknown>) => {
    void loader()
    return vi.fn((props: ClientOnlyStubProps) => {
      if (props.onValuesChange !== undefined) {
        props.onValuesChange(props.values)
      }

      return props.fallback ?? null
    })
  }),
}))
const coverImageMocks = vi.hoisted(() => ({prepareAlbumCover: vi.fn()}))

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('@solidjs/start', () => startMocks)
vi.mock('../cover-image', () => coverImageMocks)

import {AdminMusic} from '../AdminMusic'
import {createEmptyAlbumTranslations} from '../../features/admin-music'
import {writeAlbumDraftData} from '../../features/admin-music/album-draft-storage'

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
  coverImageMocks.prepareAlbumCover
    .mockReset()
    .mockResolvedValue(new File(['prepared-cover'], 'cover.webp', {type: 'image/webp'}))
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

  it('should report HTTP and unknown catalog loading failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 500})),
    )
    render(() => <AdminMusic />)

    expect(await screen.findByText('음악 목록을 불러오지 못했습니다.')).toBeTruthy()

    cleanup()
    vi.mocked(fetch).mockRejectedValueOnce('network unavailable')
    render(() => <AdminMusic />)

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
    render(() => <AdminMusic />)

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

  it('should render a prepared cover preview', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:stored-cover')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({albums: [], assets: [], offers: [], tracks: []})),
    )
    render(() => <AdminMusic />)
    const coverInput = await screen.findByLabelText(/^이미지 파일/u)
    const cover = new File(['cover'], 'cover.png', {type: 'image/png'})
    Object.defineProperty(coverInput, 'files', {value: {item: () => cover}})
    fireEvent.change(coverInput)

    const preview = await screen.findByRole('img', {name: '업로드할 앨범 커버 미리보기'})
    expect(preview.getAttribute('src')).toBe('blob:stored-cover')
    expect(screen.getByText('업로드될 최종 이미지입니다.')).toBeTruthy()
  })

  it('should wire cover fields and show the processing state while conversion is pending', async () => {
    let resolveCover: (file: File) => void = () => undefined
    const coverPreparation = new Promise<File>((resolve) => {
      resolveCover = resolve
    })
    coverImageMocks.prepareAlbumCover.mockReturnValue(coverPreparation)
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({albums: [], assets: [], offers: [], tracks: []})),
    )
    render(() => <AdminMusic />)
    const coverInput = await screen.findByLabelText(/^이미지 파일/u)
    const urlInput = screen.getByLabelText('외부 HTTPS 주소')
    const fallbackSelect = screen.getByLabelText('이미지가 없을 때')

    fireEvent.input(urlInput, {target: {value: 'https://example.com/cover.jpg'}})
    fireEvent.change(fallbackSelect, {target: {value: 'cd'}})
    expect((urlInput as HTMLInputElement).value).toBe('https://example.com/cover.jpg')
    expect((fallbackSelect as HTMLSelectElement).value).toBe('cd')

    const file = new File(['cover'], 'cover.png', {type: 'image/png'})
    Object.defineProperty(coverInput, 'files', {value: {item: () => file}})
    fireEvent.change(coverInput)
    expect(await screen.findByRole('button', {name: '커버 이미지 처리 중…'})).toBeDisabled()

    cleanup()
    resolveCover(new File(['prepared'], 'cover.webp', {type: 'image/webp'}))
    await coverPreparation
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

      return Response.json({albums: [], assets: [], offers: [], tracks: []})
    })
    vi.stubGlobal('fetch', fetcher)
    render(() => <AdminMusic />)
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

  it.each([
    {
      action: 'publish',
      catalog: catalogWithAlbum,
      confirmLabel: '공개하기',
      message: '앨범을 공개했습니다.',
    },
    {
      action: 'archive',
      catalog: {
        ...catalogWithAlbum,
        albums: [{...catalogWithAlbum.albums[0], status: 'published'}],
      },
      confirmLabel: '보관하기',
      message: '앨범을 보관했습니다.',
    },
  ] as const)(
    'should complete the $action album status action',
    async ({catalog, confirmLabel, message}) => {
      const fetcher = vi.fn<typeof fetch>(async (_input, options) =>
        options?.method === 'POST' ? new Response(null, {status: 204}) : Response.json(catalog),
      )
      vi.stubGlobal('fetch', fetcher)
      render(() => <AdminMusic />)

      fireEvent.click(await screen.findByRole('button', {name: /공개 설정|보관 검토/u}))
      fireEvent.click(screen.getByRole('button', {name: confirmLabel}))

      expect(await screen.findByText(message)).toBeTruthy()
      expect(fetcher).toHaveBeenCalledWith('/api/admin/music/status', {
        body: expect.any(String),
        headers: {'Content-Type': 'application/json'},
        method: 'POST',
      })
    },
  )

  it('should report HTTP and unknown album status failures', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(catalogWithAlbum))
      .mockResolvedValueOnce(new Response(null, {status: 500}))
    vi.stubGlobal('fetch', fetcher)
    render(() => <AdminMusic />)

    fireEvent.click(await screen.findByRole('button', {name: '공개 설정'}))
    fireEvent.click(screen.getByRole('button', {name: '공개하기'}))
    expect(
      await screen.findByText('저장하지 못했습니다. 입력값과 로그인 상태를 확인해 주세요.'),
    ).toBeTruthy()

    cleanup()
    fetcher
      .mockReset()
      .mockResolvedValueOnce(Response.json(catalogWithAlbum))
      .mockRejectedValueOnce('network')
    render(() => <AdminMusic />)
    fireEvent.click(await screen.findByRole('button', {name: '공개 설정'}))
    fireEvent.click(screen.getByRole('button', {name: '공개하기'}))
    expect(await screen.findByText('앨범 상태를 변경하지 못했습니다.')).toBeTruthy()
  })

  it('should connect an offer with submitted and missing form values', async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, options) =>
      options?.method === 'POST'
        ? new Response(null, {status: 204})
        : Response.json(catalogWithAlbum),
    )
    vi.stubGlobal('fetch', fetcher)
    render(() => <AdminMusic />)
    fireEvent.click(await screen.findByRole('tab', {name: '판매 및 공개'}))
    const skuInput = screen.getByLabelText('앱인토스 상품 ID (SKU)')
    fireEvent.input(skuInput, {target: {value: 'sku-1'}})
    const offerForm = skuInput.closest('form')

    if (offerForm === null) {
      throw new Error('상품 연결 폼을 찾지 못했습니다.')
    }

    fireEvent.submit(offerForm)
    expect(await screen.findByText('앱인토스 일회성 판매 상품을 연결했습니다.')).toBeTruthy()
    expect(fetcher).toHaveBeenCalledWith('/api/admin/music/offers', {
      body: JSON.stringify({
        albumId: 'album-id',
        externalProductId: 'sku-1',
        provider: 'apps-in-toss',
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })

    offerForm.querySelectorAll('[name]').forEach((element) => element.removeAttribute('name'))
    fireEvent.submit(offerForm)
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(5))
    expect(fetcher).toHaveBeenLastCalledWith('/api/admin/music')
    expect(fetcher).toHaveBeenNthCalledWith(4, '/api/admin/music/offers', {
      body: JSON.stringify({albumId: '', externalProductId: '', provider: 'apps-in-toss'}),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })
  })

  it('should report HTTP and unknown offer connection failures', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(catalogWithAlbum))
      .mockResolvedValueOnce(new Response(null, {status: 500}))
    vi.stubGlobal('fetch', fetcher)
    render(() => <AdminMusic />)
    fireEvent.click(await screen.findByRole('tab', {name: '판매 및 공개'}))
    const offerForm = screen.getByLabelText('앱인토스 상품 ID (SKU)').closest('form')

    if (offerForm === null) {
      throw new Error('상품 연결 폼을 찾지 못했습니다.')
    }

    fireEvent.submit(offerForm)
    expect(
      await screen.findByText('저장하지 못했습니다. 입력값과 로그인 상태를 확인해 주세요.'),
    ).toBeTruthy()

    cleanup()
    fetcher
      .mockReset()
      .mockResolvedValueOnce(Response.json(catalogWithAlbum))
      .mockRejectedValueOnce('network')
    render(() => <AdminMusic />)
    fireEvent.click(await screen.findByRole('tab', {name: '판매 및 공개'}))
    const nextOfferForm = screen.getByLabelText('앱인토스 상품 ID (SKU)').closest('form')

    if (nextOfferForm === null) {
      throw new Error('상품 연결 폼을 찾지 못했습니다.')
    }

    fireEvent.submit(nextOfferForm)
    expect(await screen.findByText('판매 상품을 연결하지 못했습니다.')).toBeTruthy()
  })
})
