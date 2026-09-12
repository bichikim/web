/** @vitest-environment jsdom */

import {cleanup, fireEvent, screen, waitFor} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'

import {catalogWithAlbum, coverImageMocks, renderAdminMusic} from './fixtures/admin-music'

describe('AdminMusic', () => {
  it('should only ask for the Apps in Toss SKU when connecting a product', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(catalogWithAlbum)))
    renderAdminMusic()

    fireEvent.click(await screen.findByRole('tab', {name: '판매 및 공개'}))

    expect(screen.getByText('앱인토스 상품 ID (SKU)')).toBeTruthy()
    expect(screen.queryByText('내부 상품 코드')).toBeNull()
  })

  it('should review zero tracks and pending sales before publishing', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(catalogWithAlbum)))
    renderAdminMusic()

    fireEvent.click(await screen.findByRole('button', {name: '공개 설정'}))

    expect(screen.getByRole('tab', {name: '판매 및 공개'}).getAttribute('aria-selected')).toBe(
      'true',
    )
    expect(screen.getByRole('heading', {name: '이 앨범을 공개할까요?'})).toBeTruthy()
    expect(
      screen.getByText('수록곡이 없어도 공개됩니다. 상품이 없으면 가격을 표시하지 않습니다.'),
    ).toBeTruthy()
  })

  it('should discard a status review when selecting another album', async () => {
    const catalog = {
      ...catalogWithAlbum,
      albums: [
        {
          ...catalogWithAlbum.albums[0],
          id: 'draft-album',
          translations: [
            {
              albumId: 'draft-album',
              description: '초안 설명',
              locale: 'ko',
              title: '초안 앨범',
            },
          ],
        },
        {
          ...catalogWithAlbum.albums[0],
          id: 'published-album',
          status: 'published',
          translations: [
            {
              albumId: 'published-album',
              description: '공개 설명',
              locale: 'ko',
              title: '공개 앨범',
            },
          ],
        },
      ],
    } as const
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(catalog))
    vi.stubGlobal('fetch', fetcher)
    renderAdminMusic()

    fireEvent.click(await screen.findByRole('button', {name: '공개 설정'}))
    expect(screen.getByRole('heading', {name: '이 앨범을 공개할까요?'})).toBeTruthy()

    fireEvent.click(screen.getByRole('button', {name: /공개 앨범/u}))

    expect(screen.getByRole('tab', {name: '수록곡 0'}).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByLabelText('앨범 상태 변경 확인')).toBeNull()
    expect(screen.queryByRole('button', {name: '보관하기'})).toBeNull()
    expect(fetcher).toHaveBeenCalledOnce()
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
      renderAdminMusic()

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
    renderAdminMusic()

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
    renderAdminMusic()
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
    renderAdminMusic()
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
    renderAdminMusic()
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
    renderAdminMusic()
    fireEvent.click(await screen.findByRole('tab', {name: '판매 및 공개'}))
    const nextOfferForm = screen.getByLabelText('앱인토스 상품 ID (SKU)').closest('form')

    if (nextOfferForm === null) {
      throw new Error('상품 연결 폼을 찾지 못했습니다.')
    }

    fireEvent.submit(nextOfferForm)
    expect(await screen.findByText('판매 상품을 연결하지 못했습니다.')).toBeTruthy()
  })
})
