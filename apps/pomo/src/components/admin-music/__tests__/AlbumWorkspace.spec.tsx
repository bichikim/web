/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {AdminAlbum} from 'src/features/admin-music'
import {AlbumWorkspace} from '../AlbumWorkspace'

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
    () =>
    (props: {
      readonly active: boolean
      readonly autoplay: boolean
      readonly fallback: unknown
      readonly onPlay: () => void
      readonly onRequest: () => void
      readonly title: string
      readonly trackId: string
    }) => {
      void props.fallback
      return (
        <button
          aria-label={`${props.title} 미리듣기`}
          data-active={String(props.active)}
          data-autoplay={String(props.autoplay)}
          data-track-id={props.trackId}
          onClick={props.onRequest}
          onDblClick={props.onPlay}
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
  TrackFields: (props: {
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

import {BASE_CATALOG, createAlbum, createModelHarness} from './fixtures/model'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
})

describe('AlbumWorkspace', () => {
  it('should expose a pending registration for confirmation or explicit removal', () => {
    const harness = createModelHarness({
      ...BASE_CATALOG,
      assets: BASE_CATALOG.assets.filter((asset) => asset.id === 'asset-pending'),
      offers: [],
      tracks: [],
    })
    render(() => <AlbumWorkspace album={createAlbum()} model={harness.model} />)

    expect(screen.getByRole('heading', {name: '등록 확인 필요 1'})).toBeInTheDocument()
    expect(screen.getByText('등록 결과 확인 필요')).toBeInTheDocument()
    expect(screen.queryByText('Other pending')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: 'Pending track 등록 확인 재시도'}))
    expect(harness.model.handleTrackConfirmation).toHaveBeenCalledWith('asset-pending')

    harness.setConfirmingAssetId('asset-pending')
    expect(screen.getByRole('button', {name: 'Pending track 등록 확인 재시도'})).toBeDisabled()
    expect(screen.getByText('확인 중…')).toBeInTheDocument()

    harness.setConfirmingAssetId(null)
    fireEvent.click(screen.getByRole('button', {name: 'Pending track 대기 등록 삭제'}))
    expect(harness.model.handleTrackRemove).not.toHaveBeenCalled()
    vi.mocked(globalThis.confirm).mockReturnValueOnce(true)
    fireEvent.click(screen.getByRole('button', {name: 'Pending track 대기 등록 삭제'}))
    expect(harness.model.handleTrackRemove).toHaveBeenCalledWith('pending')
    expect(globalThis.confirm).toHaveBeenLastCalledWith(expect.stringContaining('대기 등록을 삭제'))
  })

  it('should describe a failed pending asset without offering a futile confirmation', () => {
    const harness = createModelHarness({
      ...BASE_CATALOG,
      assets: BASE_CATALOG.assets.map((asset) =>
        asset.id === 'asset-pending' ? {...asset, status: 'failed'} : asset,
      ),
    })
    render(() => <AlbumWorkspace album={createAlbum()} model={harness.model} />)

    expect(screen.getByText('MP3 검증 실패')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {name: 'Pending track 등록 확인 재시도'}),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Pending track 대기 등록 삭제'})).toBeInTheDocument()
  })

  it('should show the empty track state and open the first-track form', () => {
    const harness = createModelHarness({...BASE_CATALOG, assets: [], pendingTracks: []})
    render(() => <AlbumWorkspace album={createAlbum()} model={harness.model} />)

    expect(screen.getByRole('tab', {name: '수록곡 0'})).toHaveAttribute('aria-selected', 'true')
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
    expect(globalThis.confirm).toHaveBeenCalledWith(
      expect.not.stringContaining('현재 공개 중인 앨범'),
    )
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
    expect(screen.getByText(/파일마다 ‘제목 없음’/)).toBeInTheDocument()
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

    fireEvent.submit(screen.getByRole('form', {name: '일회성 상품 연결'}))
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

    tracksTab.focus()
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

    expect(screen.getByRole('tab', {name: '판매 및 공개'})).toHaveAttribute('aria-selected', 'true')
  })
})
