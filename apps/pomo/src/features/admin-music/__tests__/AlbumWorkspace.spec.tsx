/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {AlbumWorkspace} from '../AlbumWorkspace'
import type {AdminMusicModel} from '../AdminMusic'
import type {AdminAlbum, AdminCatalog} from '../catalog'

vi.mock('solid-js/web', async (importOriginal) => {
  const solidWeb = await importOriginal<typeof import('solid-js/web')>()

  return {
    ...solidWeb,
    createComponent: (
      component: Parameters<typeof solidWeb.createComponent>[0],
      props: Parameters<typeof solidWeb.createComponent>[1],
    ) => {
      if (typeof props === 'object' && props !== null && Object.hasOwn(props, 'albumTitle')) {
        void Reflect.get(props, 'albumTitle')
      }

      return solidWeb.createComponent(component, props)
    },
  }
})
vi.mock('@solidjs/start', () => ({
  clientOnly:
    (loader: () => Promise<unknown>) =>
    (props: {
      readonly active: boolean
      readonly fallback: unknown
      readonly onPlay: () => void
      readonly title: string
      readonly trackId: string
    }) => {
      void loader()
      void props.fallback
      return (
        <button
          aria-label={`${props.title} 미리듣기`}
          data-active={String(props.active)}
          data-track-id={props.trackId}
          onClick={props.onPlay}
          type="button"
        >
          미리듣기
        </button>
      )
    },
}))
vi.mock('../AlbumReleaseCard', () => ({
  AlbumReleaseCard: (props: {
    readonly activeOfferCount: number
    readonly album: AdminAlbum
    readonly onPublicSettingsSelect: () => void
    readonly trackCount: number
  }) => {
    void props.album
    return (
      <button onClick={props.onPublicSettingsSelect} type="button">
        공개 설정 {props.trackCount}/{props.activeOfferCount}
      </button>
    )
  },
}))
vi.mock('../TrackFields', () => ({
  default: (props: {
    readonly artist: string
    readonly onArtistChange: (value: string) => void
    readonly onTitleChange: (value: string) => void
    readonly resetVersion: number
    readonly title: string
  }) => (
    <div data-reset={props.resetVersion}>
      <button onClick={() => props.onArtistChange('새 가수')} type="button">
        가수 변경
      </button>
      <button onClick={() => props.onTitleChange('새 제목')} type="button">
        제목 변경
      </button>
      <span>{props.artist}</span>
      <span>{props.title}</span>
    </div>
  ),
}))

const createAlbum = (
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

const BASE_CATALOG: AdminCatalog = {
  albums: [createAlbum()],
  assets: [
    {id: 'asset-two', status: 'active', trackId: 'two'},
    {id: 'asset-one', status: 'active', trackId: 'one'},
    {id: 'asset-hidden', status: 'pending', trackId: 'hidden'},
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
  readonly setRemovingTrackId: (id: string | null) => void
  readonly setSavingOffer: (saving: boolean) => void
  readonly setSavingTrack: (saving: boolean) => void
  readonly setUpdatingAlbumId: (id: string | null) => void
}

const createModelHarness = (initialCatalog: AdminCatalog = BASE_CATALOG): ModelHarness => {
  const [catalog, setCatalog] = createSignal(initialCatalog)
  const [removingTrackId, setRemovingTrackId] = createSignal<string | null>(null)
  const [savingOffer, setSavingOffer] = createSignal(false)
  const [savingTrack, setSavingTrack] = createSignal(false)
  const [updatingAlbumId, setUpdatingAlbumId] = createSignal<string | null>(null)
  const model = {
    catalog,
    handleAlbumStatusChange: vi.fn().mockResolvedValue(undefined),
    handleOfferSubmit: vi.fn(),
    handleTrackRemove: vi.fn().mockResolvedValue(undefined),
    handleTrackSubmit: vi.fn(),
    isSavingOffer: savingOffer,
    isSavingTrack: savingTrack,
    removingTrackId,
    setTrackArtist: vi.fn(),
    setTrackTitle: vi.fn(),
    trackArtist: () => '기존 가수',
    trackResetVersion: () => 3,
    trackTitle: () => '기존 제목',
    updatingAlbumId,
  } as unknown as AdminMusicModel

  return {
    model,
    setCatalog,
    setRemovingTrackId,
    setSavingOffer,
    setSavingTrack,
    setUpdatingAlbumId,
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(false)
})

describe('AlbumWorkspace', () => {
  it('should manage playable tracks, track creation, preview, and confirmed removal', async () => {
    const harness = createModelHarness()
    render(() => <AlbumWorkspace album={createAlbum('published')} model={harness.model} />)

    expect(screen.getByRole('button', {name: '공개 설정 2/1'})).toBeInTheDocument()
    expect(screen.getByRole('heading', {name: '수록곡 2'})).toBeInTheDocument()
    const previews = screen.getAllByRole('button', {name: /미리듣기$/})
    expect(previews.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Track one 미리듣기',
      'Track two 미리듣기',
    ])
    fireEvent.click(previews[0]!)
    expect(previews[0]).toHaveAttribute('data-active', 'true')

    fireEvent.click(screen.getByRole('button', {name: '+ 곡 추가'}))
    expect(screen.getByText('새 곡 추가')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '가수 변경'}))
    fireEvent.click(screen.getByRole('button', {name: '제목 변경'}))
    expect(harness.model.setTrackArtist).toHaveBeenCalledWith('새 가수')
    expect(harness.model.setTrackTitle).toHaveBeenCalledWith('새 제목')
    fireEvent.submit(screen.getByText('새 곡 추가').closest('form')!)
    expect(harness.model.handleTrackSubmit).toHaveBeenCalledOnce()

    harness.setSavingTrack(true)
    expect(screen.getByRole('button', {name: '곡 저장·MP3 검증 중…'})).toBeDisabled()
    fireEvent.click(screen.getByRole('button', {name: '닫기'}))
    expect(screen.queryByText('새 곡 추가')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: 'Track one 수록곡 삭제'}))
    expect(harness.model.handleTrackRemove).not.toHaveBeenCalled()
    vi.mocked(window.confirm).mockReturnValueOnce(true)
    fireEvent.click(screen.getByRole('button', {name: 'Track two 수록곡 삭제'}))
    await waitFor(() => expect(harness.model.handleTrackRemove).toHaveBeenCalledWith('two'))
    expect(window.confirm).toHaveBeenLastCalledWith(
      expect.stringContaining('현재 공개 중인 앨범에서도 즉시 사라지며'),
    )

    harness.setRemovingTrackId('one')
    expect(screen.getByRole('button', {name: 'Track one 수록곡 삭제'})).toBeDisabled()
    expect(screen.getByText('삭제 중…')).toBeInTheDocument()
  })

  it('should show the empty track state and open the first-track form', () => {
    const harness = createModelHarness({...BASE_CATALOG, assets: []})
    render(() => <AlbumWorkspace album={createAlbum()} model={harness.model} />)

    expect(screen.getByText('아직 수록곡이 없습니다.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '첫 곡 추가'}))
    expect(screen.getByText('새 곡 추가')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '추가 화면 닫기'}))
    expect(screen.queryByText('새 곡 추가')).not.toBeInTheDocument()
  })

  it('should omit the publication warning when removing from a draft album', () => {
    const harness = createModelHarness()
    render(() => <AlbumWorkspace album={createAlbum('draft')} model={harness.model} />)

    fireEvent.click(screen.getByRole('button', {name: 'Track one 수록곡 삭제'}))
    expect(window.confirm).toHaveBeenCalledWith(expect.not.stringContaining('현재 공개 중인 앨범'))
  })

  it('should display translated details and the no-translation fallback', () => {
    const harness = createModelHarness()
    const result = render(() => <AlbumWorkspace album={createAlbum()} model={harness.model} />)
    fireEvent.click(screen.getByRole('tab', {name: '기본 정보'}))

    expect(screen.getByText('한국어 앨범')).toBeInTheDocument()
    expect(screen.getByText('영어')).toBeInTheDocument()
    expect(screen.getByText('일본어')).toBeInTheDocument()
    expect(screen.getByText('중국어 간체')).toBeInTheDocument()
    result.unmount()

    render(() => <AlbumWorkspace album={createAlbum('draft', [])} model={harness.model} />)
    fireEvent.click(screen.getByRole('button', {name: '+ 곡 추가'}))
    expect(screen.getByText(/MP3 하나가 ‘제목 없음’/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', {name: '기본 정보'}))
    expect(screen.getByText('등록된 선택 언어가 없습니다.')).toBeInTheDocument()
  })

  it('should review draft publication, submit an offer, and close after confirmation', async () => {
    const harness = createModelHarness({...BASE_CATALOG, offers: []})
    const album = createAlbum('draft')
    render(() => <AlbumWorkspace album={album} model={harness.model} />)

    fireEvent.click(screen.getByRole('button', {name: '공개 설정 2/0'}))
    expect(screen.getByText('초안')).toBeInTheDocument()
    expect(screen.getAllByText('판매 준비중')).toHaveLength(2)
    expect(screen.getByRole('region', {name: '앨범 상태 변경 확인'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '취소'}))
    expect(screen.queryByRole('region', {name: '앨범 상태 변경 확인'})).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '공개 검토'}))
    fireEvent.click(screen.getByRole('button', {name: '공개하기'}))
    await waitFor(() =>
      expect(harness.model.handleAlbumStatusChange).toHaveBeenCalledWith('album', 'publish'),
    )
    expect(screen.queryByRole('region', {name: '앨범 상태 변경 확인'})).not.toBeInTheDocument()

    fireEvent.submit(screen.getByText('일회성 상품 연결').closest('form')!)
    expect(harness.model.handleOfferSubmit).toHaveBeenCalledOnce()
    harness.setSavingOffer(true)
    expect(screen.getByRole('button', {name: '연결 중…'})).toBeDisabled()
  })

  it('should show active sales and archive a published album', async () => {
    const harness = createModelHarness()
    render(() => <AlbumWorkspace album={createAlbum('published')} model={harness.model} />)
    fireEvent.click(screen.getByRole('tab', {name: '판매 및 공개'}))

    expect(screen.getByText('현재 공개 중')).toBeInTheDocument()
    expect(screen.getByText('판매 상품 연결됨')).toBeInTheDocument()
    expect(screen.getByText('sku-active')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '보관 검토'}))
    expect(screen.getByText('이 앨범을 보관할까요?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '보관하기'}))
    await waitFor(() =>
      expect(harness.model.handleAlbumStatusChange).toHaveBeenCalledWith('album', 'archive'),
    )

    fireEvent.click(screen.getByRole('button', {name: '보관 검토'}))
    harness.setUpdatingAlbumId('album')
    expect(screen.getByRole('button', {name: '처리 중…'})).toBeDisabled()
  })

  it('should disable an unready draft and label an archived album', () => {
    const harness = createModelHarness()
    const result = render(() => (
      <AlbumWorkspace album={createAlbum('draft', undefined, false)} model={harness.model} />
    ))
    fireEvent.click(screen.getByRole('tab', {name: '판매 및 공개'}))
    fireEvent.click(screen.getByRole('button', {name: '공개 검토'}))
    expect(screen.getByRole('button', {name: '공개하기'})).toBeDisabled()
    result.unmount()

    render(() => <AlbumWorkspace album={createAlbum('archived')} model={harness.model} />)
    fireEvent.click(screen.getByRole('tab', {name: '판매 및 공개'}))
    expect(screen.getByText('보관됨')).toBeInTheDocument()
  })

  it('should navigate tabs with arrows, home, end, and ignore unrelated keys', () => {
    const harness = createModelHarness()
    render(() => <AlbumWorkspace album={createAlbum()} model={harness.model} />)
    const tracksTab = screen.getByRole('tab', {name: '수록곡 2'})

    fireEvent.keyDown(tracksTab, {key: 'Enter'})
    expect(tracksTab).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(tracksTab, {key: 'ArrowRight'})
    expect(screen.getByRole('tab', {name: '판매 및 공개'})).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('tab', {name: '판매 및 공개'}), {key: 'Home'})
    expect(screen.getByRole('tab', {name: '기본 정보'})).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('tab', {name: '기본 정보'}), {key: 'End'})
    expect(screen.getByRole('tab', {name: '판매 및 공개'})).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('tab', {name: '판매 및 공개'}), {key: 'ArrowRight'})
    expect(screen.getByRole('tab', {name: '기본 정보'})).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('tab', {name: '기본 정보'}), {key: 'ArrowLeft'})
    expect(screen.getByRole('tab', {name: '판매 및 공개'})).toHaveFocus()

    const detached = screen.getByRole('tab', {name: '판매 및 공개'})
    detached.remove()
    fireEvent.keyDown(detached, {key: 'Home'})

    const detailsTab = screen.getByRole('tab', {name: '기본 정보'})
    const findIndex = vi.spyOn(Array.prototype, 'findIndex').mockReturnValueOnce(Number.NaN)
    fireEvent.keyDown(detailsTab, {key: 'ArrowRight'})
    findIndex.mockRestore()
    expect(detailsTab).toHaveAttribute('aria-selected', 'true')
  })
})
