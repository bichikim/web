/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {AdminAsset, AdminPendingTrack} from '../../features/admin-music'
import {PendingTrackList} from './PendingTrackList'

const createTrack = (id: string): AdminPendingTrack => ({
  albumId: 'album',
  artist: `${id} artist`,
  id,
  title: `${id} title`,
})

const createAsset = (trackId: string, status: AdminAsset['status']): AdminAsset => ({
  id: `${trackId}-asset`,
  status,
  trackId,
})

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(false)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('PendingTrackList', () => {
  it('should label every recoverable state and only confirm reusable assets', async () => {
    const statuses = [
      'active',
      'pending',
      'uploaded',
      'ready',
      'failed',
      'retired',
      'deleted',
    ] as const
    const pendingTracks = [...statuses.map(createTrack), createTrack('missing')]
    const assets = statuses.map((status) => createAsset(status, status))
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onRemove = vi.fn().mockResolvedValue(undefined)
    render(() => (
      <PendingTrackList
        assets={assets}
        onConfirm={onConfirm}
        onRemove={onRemove}
        pendingTracks={pendingTracks}
      />
    ))

    expect(screen.getByText('활성화 반영 확인 필요')).toBeInTheDocument()
    expect(screen.getByText('등록 결과 확인 필요')).toBeInTheDocument()
    expect(screen.getAllByText('등록 처리 중')).toHaveLength(2)
    expect(screen.getByText('MP3 검증 실패')).toBeInTheDocument()
    expect(screen.getAllByText('사용할 수 없는 MP3')).toHaveLength(2)
    expect(screen.getByText('MP3 업로드 정보 없음')).toBeInTheDocument()
    expect(screen.getAllByRole('button', {name: /등록 확인 재시도$/u})).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', {name: 'active title 등록 확인 재시도'}))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('active-asset'))

    fireEvent.click(screen.getByRole('button', {name: 'failed title 대기 등록 삭제'}))
    expect(onRemove).not.toHaveBeenCalled()
    vi.mocked(window.confirm).mockReturnValueOnce(true)
    fireEvent.click(screen.getByRole('button', {name: 'failed title 대기 등록 삭제'}))
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith('failed'))
  })

  it('should lock conflicting actions for the same pending row', () => {
    const pendingTrack = createTrack('pending')
    const pendingAsset = createAsset('pending', 'pending')
    const result = render(() => (
      <PendingTrackList
        assets={[pendingAsset]}
        confirmingAssetId={pendingAsset.id}
        onConfirm={vi.fn()}
        onRemove={vi.fn()}
        pendingTracks={[pendingTrack]}
      />
    ))

    expect(screen.getByRole('button', {name: 'pending title 등록 확인 재시도'})).toBeDisabled()
    expect(screen.getByRole('button', {name: 'pending title 대기 등록 삭제'})).toBeDisabled()
    result.unmount()

    render(() => (
      <PendingTrackList
        assets={[pendingAsset]}
        onConfirm={vi.fn()}
        onRemove={vi.fn()}
        pendingTracks={[pendingTrack]}
        removingTrackId={pendingTrack.id}
      />
    ))
    expect(screen.getByRole('button', {name: 'pending title 등록 확인 재시도'})).toBeDisabled()
    expect(screen.getByRole('button', {name: 'pending title 대기 등록 삭제'})).toBeDisabled()
  })

  it('should support empty and read-only reduced states', () => {
    const result = render(() => <PendingTrackList />)
    expect(screen.queryByRole('heading', {name: /등록 확인 필요/u})).not.toBeInTheDocument()
    result.unmount()

    render(() => <PendingTrackList pendingTracks={[createTrack('missing')]} />)
    expect(screen.getByText('MP3 업로드 정보 없음')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
