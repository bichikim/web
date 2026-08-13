/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import FocusRoomMusicPlayerClient from '../FocusRoomMusicPlayer.client'

vi.mock('media-chrome', () => ({}))

const TRACKS = [
  {artist: 'Artist', durationSeconds: 1, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 1, id: 'two', source: '/two.mp3', title: 'Two'},
  {artist: 'Artist', durationSeconds: 1, id: 'three', source: '/three.mp3', title: 'Three'},
] as const

describe('FocusRoomMusicPlayerClient', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should start a new shuffled cycle when repeat all is enabled', async () => {
    const result = render(() => <FocusRoomMusicPlayerClient tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the focus-room audio element to be rendered')
    }

    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))
    expect(screen.getByRole('button', {name: '전체 반복'}).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByRole('button', {name: '랜덤 재생'}).getAttribute('aria-pressed')).toBe(
      'true',
    )

    fireEvent(audio, new Event('ended'))
    await Promise.resolve()
    expect(audio.getAttribute('src')).toBe('/three.mp3')

    fireEvent(audio, new Event('ended'))
    await Promise.resolve()
    expect(audio.getAttribute('src')).toBe('/one.mp3')

    fireEvent(audio, new Event('ended'))
    await Promise.resolve()
    expect(audio.getAttribute('src')).toBe('/three.mp3')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(3)
  })

  it('should preserve playing state when an obsolete play request is aborted', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
      new DOMException('The play request was interrupted', 'AbortError'),
    )
    const result = render(() => <FocusRoomMusicPlayerClient tracks={TRACKS} />)
    const audio = result.container.querySelector('audio')

    if (!(audio instanceof HTMLAudioElement)) {
      throw new TypeError('Expected the focus-room audio element to be rendered')
    }

    fireEvent(audio, new Event('play'))
    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))
    fireEvent.click(screen.getByRole('button', {name: '다음 곡'}))
    await Promise.resolve()
    await Promise.resolve()

    const firstLevel = result.container.querySelector<HTMLElement>('.focus-room-level')
    expect(firstLevel?.style.opacity).toBe('0.76')
  })
})
