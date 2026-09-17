/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
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
    fireEvent(audio, new Event('loadedmetadata'))
    expect(audio.getAttribute('src')).toBe('/three.mp3')

    fireEvent(audio, new Event('ended'))
    await Promise.resolve()
    fireEvent(audio, new Event('loadedmetadata'))
    expect(audio.getAttribute('src')).toBe('/one.mp3')

    fireEvent(audio, new Event('ended'))
    await Promise.resolve()
    fireEvent(audio, new Event('loadedmetadata'))
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

    const firstLevel = screen
      .getByLabelText(m.player_audio_levels())
      .querySelector<HTMLElement>('span')
    expect(firstLevel?.classList.contains('opacity-76')).toBe(true)
    expect(firstLevel?.style.opacity).toBe('')
  })

  it('should resume the next track after the source replacement pause', async () => {
    localStorage.clear()
    const onPlayingChange = vi.fn()
    const result = render(() => (
      <PMusicPlayerContent onPlayingChange={onPlayingChange} tracks={TRACKS} />
    ))
    const audio = getAudioElement(result.container)

    vi.spyOn(audio, 'load').mockImplementation(() => undefined)
    markAudioMetadataReady(audio)
    fireEvent(audio, new Event('play'))
    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))
    fireEvent.click(screen.getByRole('button', {name: '다음 곡'}))
    await Promise.resolve()
    fireEvent(audio, new Event('pause'))

    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled()
    expect(onPlayingChange).toHaveBeenLastCalledWith(true)
    const transportControls = screen.getByRole('button', {name: '이전 곡'}).parentElement
    if (!(transportControls instanceof HTMLElement)) {
      throw new TypeError('Expected the expanded transport controls to be rendered')
    }
    const preparingPlayButton = within(transportControls).getByRole('button', {name: '일시 정지'})
    expect(preparingPlayButton).toHaveAttribute('aria-busy', 'true')

    fireEvent(audio, new Event('loadedmetadata'))
    await Promise.resolve()
    fireEvent(audio, new Event('seeking'))

    expect(audio.load).toHaveBeenCalledOnce()
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
    expect(audio.pause).not.toHaveBeenCalled()
  })

  it('should resume the next track after seeking before metadata', async () => {
    localStorage.clear()
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = getAudioElement(result.container)

    vi.spyOn(audio, 'load').mockImplementation(() => undefined)
    fireEvent(audio, new Event('play'))
    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))
    fireEvent.click(screen.getByRole('button', {name: '다음 곡'}))
    await Promise.resolve()
    audio.currentTime = 8
    fireEvent(audio, new Event('seeking'))
    fireEvent(audio, new Event('pause'))

    markAudioMetadataReady(audio)
    fireEvent(audio, new Event('loadedmetadata'))

    expect(audio.currentTime).toBe(8)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
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
