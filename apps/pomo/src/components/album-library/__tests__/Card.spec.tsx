/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

vi.mock('@solidjs/router', async () => {
  const actual: typeof import('@solidjs/router') = await vi.importActual('@solidjs/router')
  return {
    ...actual,
    action: vi.fn((clientAction) => clientAction),
    useAction: vi.fn((clientAction) => clientAction),
    useSubmissions: vi.fn(() => []),
  }
})

import type {
  PAlbumSale,
  PResolvedAlbum,
  PTrack,
  PTrackListing,
  PTrackPreviewRequest,
} from '../../../features/focus-room-audio'
import {AlbumCard} from '../Card'

const TRACK: PTrack = {
  artist: '테스트 가수',
  durationSeconds: 185,
  id: 'track-one',
  source: '/track-one.mp3',
  title: '테스트 곡',
}

const LISTING: PTrackListing = {
  artist: '판매 가수',
  id: 'sale-track',
  title: '판매 곡',
}

const createAlbum = (options: {
  readonly id: string
  readonly sale?: PAlbumSale
  readonly trackListings?: readonly PTrackListing[]
  readonly tracks: readonly PTrack[]
}): PResolvedAlbum => ({
  coverImageUrl: '/cover.webp',
  description: `${options.id} 설명`,
  icon: 'i-tabler-vinyl',
  id: options.id,
  sale: options.sale,
  title: options.id,
  trackCount: options.trackListings?.length ?? options.tracks.length,
  trackIds: (options.trackListings ?? options.tracks).map((track) => track.id),
  trackListings: options.trackListings,
  tracks: options.tracks,
})

const renderCard = (album: PResolvedAlbum, isInPlayer = false) => {
  const onAddAlbum = vi.fn()
  const onAddTrack = vi.fn()
  const onPreview = vi.fn<(request: PTrackPreviewRequest) => void>()

  render(() => (
    <AlbumCard
      album={album}
      index={1}
      isInPlayer={isInPlayer}
      onAddAlbum={onAddAlbum}
      onAddTrack={onAddTrack}
      onPreview={onPreview}
      pendingTrackId={null}
      playingTrackId={null}
      trackIds={new Set()}
    />
  ))

  return {onAddAlbum, onAddTrack, onPreview}
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('AlbumCard', () => {
  it('should render playable tracks from the album fallback and add the complete album', () => {
    const album = createAlbum({id: '무료 앨범', tracks: [TRACK]})
    const {onAddAlbum, onAddTrack, onPreview} = renderCard(album)

    expect(screen.getByRole('heading', {name: album.title})).toBeTruthy()
    expect(screen.getByRole('list')).toHaveTextContent(TRACK.title)

    expect(screen.getAllByRole('button').at(-1)).not.toHaveClass('hover:translate-y-[-0.0625rem]')
    const buttons = screen.getAllByRole('button')
    buttons[0]?.click()
    buttons[1]?.click()
    buttons.at(-1)?.click()

    expect(onAddAlbum).toHaveBeenCalledWith(album)
    expect(onAddTrack).toHaveBeenCalledWith(TRACK)
    expect(onPreview).toHaveBeenCalledWith({id: TRACK.id, source: TRACK.source})
  })

  it('should show the preparing state for an empty free album', () => {
    renderCard({...createAlbum({id: '준비 중 앨범', tracks: []}), coverImageUrl: ''})

    expect(screen.getByText('수록곡을 준비하고 있어요')).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('should derive the summary track count when catalog metadata omits it', () => {
    const {trackCount: _trackCount, ...album} = createAlbum({
      id: '수록곡 계산 앨범',
      tracks: [TRACK],
    })

    renderCard(album)

    expect(screen.getByText(/1곡/u)).toBeInTheDocument()
  })

  it('should disable adding an album that is already in the player', () => {
    renderCard(createAlbum({id: '추가된 앨범', tracks: [TRACK]}), true)

    expect(screen.getAllByRole('button').at(-1)).toBeDisabled()
    expect(screen.getAllByRole('button').at(-1)).not.not.toHaveClass(
      'hover:translate-y-[-0.0625rem]',
    )
  })

  it('should render sale listings and both price-label states without free-album actions', () => {
    const pricedSale: PAlbumSale = {
      priceLabel: '₩4,900',
      state: 'configured',
      statusLabel: '판매 중',
    }
    const firstView = renderCard(
      createAlbum({
        id: '판매 앨범',
        sale: pricedSale,
        trackListings: [LISTING],
        tracks: [],
      }),
    )

    expect(screen.getByRole('list')).toHaveTextContent(LISTING.title)
    expect(screen.getByText(pricedSale.priceLabel as string)).toBeTruthy()
    expect(screen.getByText(pricedSale.statusLabel)).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(firstView.onAddAlbum).not.toHaveBeenCalled()

    cleanup()

    const unpricedSale: PAlbumSale = {
      state: 'preparing',
      statusLabel: '판매 준비 중',
    }
    renderCard(
      createAlbum({
        id: '가격 미정 앨범',
        sale: unpricedSale,
        trackListings: [],
        tracks: [],
      }),
    )

    expect(screen.getByText(unpricedSale.statusLabel)).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('should restrict an unpurchased web album to previews and checkout', () => {
    const album = {
      ...createAlbum({id: '웹 판매 앨범', trackListings: [LISTING], tracks: []}),
      offers: [
        {
          amountMinor: '4900',
          currency: 'KRW',
          externalProductId: 'price-album-1',
          fractionalDigits: 0,
          productId: 'product-album-1',
          provider: 'paddle' as const,
        },
      ],
      productId: 'product-album-1',
    }

    renderCard(album)

    expect(screen.getByRole('button', {name: '구매하기'})).toBeTruthy()
    expect(screen.getByRole('button', {name: '판매 곡 30초 미리듣기'})).toBeTruthy()
    expect(screen.queryByRole('button', {name: /플레이어에 추가/u})).toBeNull()
  })

  it('should use full-access playback labels after ownership is restored', () => {
    const album = {
      ...createAlbum({id: '소유 앨범', trackListings: [LISTING], tracks: []}),
      offers: [
        {
          amountMinor: '4900',
          currency: 'KRW',
          externalProductId: 'price-album-1',
          fractionalDigits: 0,
          productId: 'product-album-1',
          provider: 'paddle' as const,
        },
      ],
      owned: true,
      productId: 'product-album-1',
    }

    renderCard(album)

    expect(screen.getByText('구매한 앨범')).toBeTruthy()
    expect(screen.getByRole('button', {name: '판매 곡 재생'})).toBeTruthy()
    expect(screen.queryByText('수록곡을 준비하고 있어요')).toBeNull()
    expect(screen.queryByRole('button', {name: '구매하기'})).toBeNull()
  })

  it('should not expose web checkout from the Apps in Toss runtime', () => {
    vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
    const album = {
      ...createAlbum({id: '앱인토스 앨범', trackListings: [LISTING], tracks: []}),
      offers: [
        {
          amountMinor: '4900',
          currency: 'KRW',
          externalProductId: 'price-album-1',
          fractionalDigits: 0,
          productId: 'product-album-1',
          provider: 'paddle' as const,
        },
      ],
      productId: 'product-album-1',
    }

    renderCard(album)

    expect(screen.queryByRole('button', {name: '구매하기'})).toBeNull()
  })
})
