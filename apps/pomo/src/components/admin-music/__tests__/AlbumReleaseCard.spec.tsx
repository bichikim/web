/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {AlbumReleaseCard} from '../AlbumReleaseCard'
import type {AdminAlbum} from '../../../features/admin-music'

const ALBUM: AdminAlbum = {
  coverFallback: 'lp',
  coverImageUrl: null,
  id: 'album-id',
  release: {blockers: [], ready: true},
  status: 'draft',
  translations: [{albumId: 'album-id', description: '설명', locale: 'ko', title: '첫 앨범'}],
}

afterEach(() => cleanup())

describe('AlbumReleaseCard', () => {
  it('should summarize the selected album without a readiness checklist', () => {
    render(() => <AlbumReleaseCard activeOfferCount={0} album={ALBUM} trackCount={0} />)

    expect(screen.getByRole('heading', {name: '첫 앨범'})).toBeTruthy()
    expect(screen.getByText('0곡 · 판매 준비중')).toBeTruthy()
    expect(screen.queryByRole('list', {name: '출시 준비 상태'})).toBeNull()
  })

  it('should distinguish a published album with a connected product', () => {
    render(() => (
      <AlbumReleaseCard
        activeOfferCount={1}
        album={{...ALBUM, status: 'published'}}
        trackCount={2}
      />
    ))

    expect(screen.getByText('공개 중')).toBeTruthy()
    expect(screen.getByText('2곡 · 판매 상품 연결됨')).toBeTruthy()
  })

  it('should open public settings from the album header', () => {
    const onPublicSettingsSelect = vi.fn()
    render(() => <AlbumReleaseCard album={ALBUM} onPublicSettingsSelect={onPublicSettingsSelect} />)

    fireEvent.click(screen.getByRole('button', {name: '공개 설정'}))

    expect(onPublicSettingsSelect).toHaveBeenCalledOnce()
  })
})
