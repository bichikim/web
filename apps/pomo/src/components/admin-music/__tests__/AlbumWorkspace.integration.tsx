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
    expect(previews[0]).toHaveAttribute('data-active', 'false')
    expect(previews[0]).toHaveAttribute('data-autoplay', 'true')
    fireEvent.doubleClick(previews[0]!)
    expect(previews[0]).toHaveAttribute('data-active', 'true')
    fireEvent.click(previews[1]!)
    expect(previews[0]).toHaveAttribute('data-active', 'true')
    expect(previews[0]).toHaveAttribute('data-autoplay', 'false')
    expect(previews[1]).toHaveAttribute('data-active', 'false')
    expect(previews[1]).toHaveAttribute('data-autoplay', 'true')

    fireEvent.click(screen.getByRole('button', {name: '+ 곡 추가'}))
    expect(screen.getByText('새 곡 추가')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/^MP3 파일 여러/u), {
      target: {files: [new File(['mp3'], 'track.mp3')]},
    })
    fireEvent.click(screen.getByRole('button', {name: '가수 변경'}))
    fireEvent.click(screen.getByRole('button', {name: '제목 변경'}))
    expect(screen.getByText('새 가수')).toBeInTheDocument()
    expect(screen.getByText('새 제목')).toBeInTheDocument()
    fireEvent.submit(screen.getByRole('form', {name: '곡 추가'}))
    expect(harness.model.submitTrack).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.getByRole('button', {name: '닫기'})).toBeEnabled())
    expect(screen.getByText('등록 완료')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '닫기'}))
    expect(screen.queryByText('새 곡 추가')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: 'Track one 수록곡 삭제'}))
    expect(harness.model.handleTrackRemove).not.toHaveBeenCalled()
    vi.mocked(globalThis.confirm).mockReturnValueOnce(true)
    fireEvent.click(screen.getByRole('button', {name: 'Track two 수록곡 삭제'}))
    await waitFor(() => expect(harness.model.handleTrackRemove).toHaveBeenCalledWith('two'))
    expect(globalThis.confirm).toHaveBeenLastCalledWith(
      expect.stringContaining('현재 공개 중인 앨범에서도 즉시 사라지며'),
    )

    harness.setRemovingTrackId('one')
    expect(screen.getByRole('button', {name: 'Track one 수록곡 삭제'})).toBeDisabled()
    expect(screen.getByText('삭제 중…')).toBeInTheDocument()
  })
})
