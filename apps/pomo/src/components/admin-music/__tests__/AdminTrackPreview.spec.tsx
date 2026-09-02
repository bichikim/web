/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('@solidjs/router', async () => {
  const actual: typeof import('@solidjs/router') = await vi.importActual('@solidjs/router')
  return {
    ...actual,
    action: vi.fn((clientAction) => clientAction),
    useAction: vi.fn((clientAction) => clientAction),
    useSubmission: vi.fn(() => ({clear: vi.fn(), pending: false})),
  }
})

import type {AdminTrackPreviewController} from 'src/features/admin-music'
import {AdminTrackPreview} from '../AdminTrackPreview'

const previewMocks = vi.hoisted(() => ({
  controller: undefined as AdminTrackPreviewController | undefined,
}))

vi.mock('src/features/admin-music', async () => {
  const actual = await vi.importActual<typeof import('src/features/admin-music')>(
    'src/features/admin-music',
  )

  return {
    ...actual,
    useAdminTrackPreview: (props: {readonly trackId: string}) =>
      previewMocks.controller ?? actual.useAdminTrackPreview(props),
  }
})

const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const PLAYBACK_URL = 'https://audio.pomofi.io/tracks/asset/source.mp3?token=signed'

beforeEach(() => {
  previewMocks.controller = undefined
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(Response.json({expiresAt: '2026-08-23T00:15:00.000Z', url: PLAYBACK_URL})),
  )
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('AdminTrackPreview', () => {
  it('should use fallback labels and clear an earlier error when audio becomes playable', async () => {
    const result = render(() => <AdminTrackPreview trackId={TRACK_ID} />)

    fireEvent.click(screen.getByRole('button', {name: '수록곡 미리듣기'}))
    await waitFor(() => expect(result.container.querySelector('audio')).not.toBeNull())
    const audio = result.container.querySelector('audio')

    if (audio === null) {
      throw new Error('관리자 미리듣기 오디오를 찾지 못했습니다.')
    }

    expect(result.container.querySelector('media-play-button')?.getAttribute('aria-label')).toBe(
      '수록곡 재생 또는 일시정지',
    )
    expect(result.container.querySelector('media-time-range')?.getAttribute('aria-label')).toBe(
      '수록곡 재생 위치',
    )
    expect(result.container.querySelector('media-mute-button')?.getAttribute('aria-label')).toBe(
      '수록곡 음소거',
    )

    fireEvent(audio, new Event('canplay'))
    fireEvent(audio, new Event('play'))

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('should absorb a rejecting playback controller', async () => {
    const startPlayback = vi.fn().mockRejectedValue(new Error('controller unavailable'))
    previewMocks.controller = {
      errorMessage: () => null,
      loading: () => false,
      onPlaybackError: vi.fn(),
      onPlaybackReady: vi.fn(),
      playbackUrl: () => null,
      startPlayback,
    }
    render(() => <AdminTrackPreview title="첫 곡" trackId={TRACK_ID} />)

    fireEvent.click(screen.getByRole('button', {name: '첫 곡 미리듣기'}))
    await waitFor(() => expect(startPlayback).toHaveBeenCalledOnce())

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('should request protected access and play the returned audio URL', async () => {
    const result = render(() => <AdminTrackPreview title="첫 곡" trackId={TRACK_ID} />)

    expect(result.container.querySelector('audio')).toBeNull()
    fireEvent.click(screen.getByRole('button', {name: '첫 곡 미리듣기'}))

    await waitFor(() => expect(result.container.querySelector('audio')?.src).toBe(PLAYBACK_URL))
    expect(fetch).toHaveBeenCalledWith(`/api/admin/music/tracks/${TRACK_ID}/playback`)
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalled()
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    expect(result.container.querySelector('media-time-range')).toBeTruthy()
  })

  it('should identify the active player and pause it when another track starts', async () => {
    const onPlay = vi.fn()
    const [active, setActive] = createSignal(true)
    const result = render(() => (
      <AdminTrackPreview active={active()} onPlay={onPlay} title="첫 곡" trackId={TRACK_ID} />
    ))
    fireEvent.click(screen.getByRole('button', {name: '첫 곡 미리듣기'}))
    await waitFor(() => expect(result.container.querySelector('audio')).not.toBeNull())
    const audio = result.container.querySelector('audio')

    if (audio === null) {
      throw new Error('관리자 미리듣기 오디오를 찾지 못했습니다.')
    }

    fireEvent(audio, new Event('play'))
    expect(onPlay).toHaveBeenCalledOnce()

    setActive(false)
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })

  it('should show a readable error when protected playback fails', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, {status: 503}))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(() => <AdminTrackPreview title="첫 곡" trackId={TRACK_ID} />)
    fireEvent.click(screen.getByRole('button', {name: '첫 곡 미리듣기'}))

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('미리듣기를 불러오지 못했습니다.'),
    )
  })

  it('should keep the player when autoplay is rejected', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(
      new DOMException('NotAllowedError'),
    )
    const result = render(() => <AdminTrackPreview title="첫 곡" trackId={TRACK_ID} />)

    fireEvent.click(screen.getByRole('button', {name: '첫 곡 미리듣기'}))

    await waitFor(() => expect(result.container.querySelector('audio')?.src).toBe(PLAYBACK_URL))
    expect(screen.queryByRole('status')).toBeNull()
    expect(result.container.querySelector('media-play-button')).toBeTruthy()
  })

  it('should discard a failed playback URL and allow another attempt', async () => {
    const result = render(() => <AdminTrackPreview title="첫 곡" trackId={TRACK_ID} />)
    fireEvent.click(screen.getByRole('button', {name: '첫 곡 미리듣기'}))
    await waitFor(() => expect(result.container.querySelector('audio')).not.toBeNull())
    const audio = result.container.querySelector('audio')

    if (audio === null) {
      throw new Error('관리자 미리듣기 오디오를 찾지 못했습니다.')
    }

    fireEvent.error(audio)

    expect(result.container.querySelector('audio')).toBeNull()
    expect(screen.getByRole('button', {name: '첫 곡 미리듣기'})).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('다시 시도해 주세요.')
  })
})
