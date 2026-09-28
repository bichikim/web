/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {changeAlbumStatus, connectAlbumOffer} from '../commands'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 204})))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('changeAlbumStatus', () => {
  it('should post the requested album status command', async () => {
    await changeAlbumStatus('album-one', 'publish')

    expect(fetch).toHaveBeenCalledWith('/api/admin/music/status', {
      body: JSON.stringify({action: 'publish', albumId: 'album-one'}),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })
  })
})

describe('connectAlbumOffer', () => {
  it('should post the Apps in Toss product connection', async () => {
    await connectAlbumOffer({
      albumId: 'album-one',
      externalProductId: 'sku-one',
      provider: 'apps-in-toss',
    })

    expect(fetch).toHaveBeenCalledWith('/api/admin/music/offers', {
      body: JSON.stringify({
        albumId: 'album-one',
        externalProductId: 'sku-one',
        provider: 'apps-in-toss',
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })
  })

  it('should reject an unsuccessful command response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, {status: 401}))

    await expect(
      connectAlbumOffer({
        albumId: 'album-one',
        externalProductId: 'sku-one',
        provider: 'apps-in-toss',
      }),
    ).rejects.toThrow('입력값과 로그인 상태를 확인해 주세요')
  })

  it('should post the Paddle Price and server price fields', async () => {
    await connectAlbumOffer({
      albumId: 'album-one',
      amountMinor: '1000',
      currency: 'USD',
      externalProductId: 'price-one',
      fractionalDigits: 2,
      provider: 'paddle',
    })

    expect(fetch).toHaveBeenCalledWith('/api/admin/music/offers', {
      body: JSON.stringify({
        albumId: 'album-one',
        amountMinor: '1000',
        currency: 'USD',
        externalProductId: 'price-one',
        fractionalDigits: 2,
        provider: 'paddle',
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })
  })
})
