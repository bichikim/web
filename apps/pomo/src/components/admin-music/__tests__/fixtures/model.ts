import {createSignal} from 'solid-js'
import type {AdminAlbum, AdminCatalog, AdminMusicModel} from 'src/features/admin-music'
import {vi} from 'vitest'
export const createAlbum = (
  status: AdminAlbum['status'] = 'draft',
  translations: AdminAlbum['translations'] = [
    {albumId: 'album', description: '한국어 설명', locale: 'ko', title: '한국어 앨범'},
    {albumId: 'album', description: 'English description', locale: 'en', title: 'English album'},
    {albumId: 'album', description: '日本語の説明', locale: 'ja', title: '日本語アルバム'},
    {albumId: 'album', description: '中文说明', locale: 'zh-Hans', title: '中文专辑'},
  ],
  ready = true,
): AdminAlbum => ({
  coverFallback: 'music',
  coverImageUrl: null,
  id: 'album',
  release: {blockers: ready ? [] : ['tracks_missing_active_asset'], ready},
  status,
  translations,
})

export const BASE_CATALOG: AdminCatalog = {
  albums: [createAlbum()],
  assets: [
    {id: 'asset-two', status: 'active', trackId: 'two'},
    {id: 'asset-one', status: 'active', trackId: 'one'},
    {id: 'asset-hidden', status: 'pending', trackId: 'hidden'},
    {id: 'asset-pending', status: 'pending', trackId: 'pending'},
    {id: 'asset-other', status: 'active', trackId: 'other'},
  ],
  offers: [
    {
      albumId: 'album',
      billingType: 'one_time',
      externalProductId: 'sku-active',
      productCode: 'active',
      productStatus: 'active',
      provider: 'apps-in-toss',
      status: 'active',
    },
    {
      albumId: 'album',
      billingType: 'subscription',
      externalProductId: 'sku-subscription',
      productCode: 'subscription',
      productStatus: 'active',
      provider: 'apps-in-toss',
      status: 'active',
    },
    {
      albumId: 'other',
      billingType: 'one_time',
      externalProductId: 'sku-other',
      productCode: 'other',
      productStatus: 'active',
      provider: 'apps-in-toss',
      status: 'active',
    },
  ],
  pendingTracks: [
    {albumId: 'album', artist: 'Pending Artist', id: 'pending', title: 'Pending track'},
    {albumId: 'other', artist: 'Other Pending', id: 'other-pending', title: 'Other pending'},
  ],
  tracks: [
    {albumId: 'album', artist: 'Artist two', id: 'two', position: 2, title: 'Track two'},
    {albumId: 'album', artist: 'Artist one', id: 'one', position: 1, title: 'Track one'},
    {albumId: 'album', artist: 'Hidden', id: 'hidden', position: 3, title: 'Hidden track'},
    {albumId: 'other', artist: 'Other', id: 'other', position: 1, title: 'Other track'},
  ],
}

interface ModelHarness {
  readonly model: AdminMusicModel
  readonly setCatalog: (catalog: AdminCatalog) => void
  readonly setConfirmingAssetId: (id: string | null) => void
  readonly setRemovingTrackId: (id: string | null) => void
  readonly setSavingOffer: (saving: boolean) => void
  readonly setSavingTrack: (saving: boolean) => void
  readonly setUpdatingAlbumId: (id: string | null) => void
}

const TRACK_RESET_VERSION = 3

export const createModelHarness = (initialCatalog: AdminCatalog = BASE_CATALOG): ModelHarness => {
  const [catalog, setCatalog] = createSignal(initialCatalog)
  const [confirmingAssetId, setConfirmingAssetId] = createSignal<string | null>(null)
  const [removingTrackId, setRemovingTrackId] = createSignal<string | null>(null)
  const [savingOffer, setSavingOffer] = createSignal(false)
  const [savingTrack, setSavingTrack] = createSignal(false)
  const [updatingAlbumId, setUpdatingAlbumId] = createSignal<string | null>(null)
  const model = {
    catalog,
    confirmingAssetId,
    handleAlbumStatusChange: vi.fn().mockResolvedValue(undefined),
    handleOfferSubmit: vi.fn(),
    handleTrackConfirmation: vi.fn().mockResolvedValue(undefined),
    handleTrackRemove: vi.fn().mockResolvedValue(undefined),
    handleTrackSubmit: vi.fn(),
    isConfirmingAsset: (assetId: string) => confirmingAssetId() === assetId,
    isRemovingTrack: (trackId: string) => removingTrackId() === trackId,
    isSavingOffer: savingOffer,
    isSavingTrack: savingTrack,
    isUpdatingAlbum: (albumId: string) => updatingAlbumId() === albumId,
    removingTrackId,
    setTrackArtist: vi.fn(),
    setTrackTitle: vi.fn(),
    trackArtist: () => '기존 가수',
    trackResetVersion: () => TRACK_RESET_VERSION,
    trackTitle: () => '기존 제목',
    updatingAlbumId,
  } as unknown as AdminMusicModel

  return {
    model,
    setCatalog,
    setConfirmingAssetId,
    setRemovingTrackId,
    setSavingOffer,
    setSavingTrack,
    setUpdatingAlbumId,
  }
}
