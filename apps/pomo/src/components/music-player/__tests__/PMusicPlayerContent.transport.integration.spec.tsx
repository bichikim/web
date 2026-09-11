/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {PMusicPlayerContent} from '../PMusicPlayerContent'
import {getAudioElement, markAudioMetadataReady, TRACKS} from './test-support/player-fixtures'

vi.mock('media-chrome', () => ({}))

describe('PMusicPlayerContent transport integration', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('should start a new shuffled cycle when repeat all is enabled', async () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = getAudioElement(result.container)

    markAudioMetadataReady(audio)
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
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = getAudioElement(result.container)

    fireEvent(audio, new Event('play'))
    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))
    fireEvent.click(screen.getByRole('button', {name: '다음 곡'}))
    await Promise.resolve()
    await Promise.resolve()

    const firstLevel = result.container.querySelector<HTMLElement>('.pomo-level')
    expect(firstLevel?.classList.contains('opacity-76')).toBe(true)
    expect(firstLevel?.style.opacity).toBe('')
  })

  it('should report the current track when selection changes', async () => {
    const onTrackChange = vi.fn()
    const result = render(() => (
      <PMusicPlayerContent onTrackChange={onTrackChange} tracks={TRACKS} />
    ))
    const audio = getAudioElement(result.container)

    expect(onTrackChange).toHaveBeenLastCalledWith(TRACKS[1])
    fireEvent(audio, new Event('ended'))
    await Promise.resolve()
    expect(onTrackChange).toHaveBeenLastCalledWith(TRACKS[2])
  })

  it('should report the actual playback state', () => {
    const onPlayingChange = vi.fn()
    const result = render(() => (
      <PMusicPlayerContent onPlayingChange={onPlayingChange} tracks={TRACKS} />
    ))
    const audio = getAudioElement(result.container)

    expect(onPlayingChange).toHaveBeenLastCalledWith(false)
    fireEvent(audio, new Event('play'))
    expect(onPlayingChange).toHaveBeenLastCalledWith(true)
    fireEvent(audio, new Event('pause'))
    expect(onPlayingChange).toHaveBeenLastCalledWith(false)
  })
})
