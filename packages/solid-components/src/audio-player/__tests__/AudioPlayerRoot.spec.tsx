/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {AudioPlayer} from '../index'

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

afterEach(() => vi.restoreAllMocks())

describe('AudioPlayerRoot', () => {
  it('should coordinate media state and controls through context', () => {
    const result = render(() => (
      <AudioPlayer.Root>
        <AudioPlayer.Media src="blob:audio" />
        <AudioPlayer.PlayButton pauseLabel="Pause preview" playLabel="Play preview" />
        <AudioPlayer.Time />
        <AudioPlayer.Time kind="duration" />
        <AudioPlayer.TimeRange
          aria-label="Preview position"
          formatValueText={(currentTime, duration) => `${currentTime}s of ${duration}s`}
        />
        <AudioPlayer.MuteButton muteLabel="Mute preview" unmuteLabel="Unmute preview" />
      </AudioPlayer.Root>
    ))
    const audio = result.container.querySelector('audio')

    if (audio === null) {
      throw new TypeError('Expected the headless audio element to render.')
    }

    Object.defineProperty(audio, 'duration', {configurable: true, value: 65.4})
    audio.currentTime = 5
    fireEvent(audio, new Event('durationchange'))
    fireEvent.timeUpdate(audio)

    expect(screen.getByText('0:05')).toBeDefined()
    expect(screen.getByText('1:05')).toBeDefined()
    expect(screen.getByRole<HTMLInputElement>('slider', {name: 'Preview position'}).value).toBe('5')
    expect(
      screen.getByRole('slider', {name: 'Preview position'}).getAttribute('aria-valuetext'),
    ).toBe('5s of 65.4s')

    fireEvent.click(screen.getByRole('button', {name: 'Play preview'}))
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()

    fireEvent.play(audio)
    expect(screen.getByRole('button', {name: 'Pause preview'}).getAttribute('data-state')).toBe(
      'playing',
    )

    fireEvent.click(screen.getByRole('button', {name: 'Mute preview'}))
    expect(audio.muted).toBe(true)
    expect(screen.getByRole('button', {name: 'Unmute preview'}).getAttribute('data-muted')).toBe(
      'true',
    )

    fireEvent.input(screen.getByRole('slider'), {target: {value: '12.5'}})
    expect(audio.currentTime).toBe(12.5)

    fireEvent(audio, new Event('emptied'))
    expect(screen.getByRole<HTMLInputElement>('slider').value).toBe('0')
    expect(screen.getByRole<HTMLInputElement>('slider').disabled).toBe(true)
  })

  it('should autoplay, report a rejected play request, and react to external pausing', async () => {
    const playError = new DOMException('NotAllowedError')
    const onPlayError = vi.fn()
    const [paused, setPaused] = createSignal(false)
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(playError)

    render(() => (
      <AudioPlayer.Root autoplay onPlayError={onPlayError} paused={paused()}>
        <AudioPlayer.Media src="blob:audio" />
      </AudioPlayer.Root>
    ))

    expect(HTMLMediaElement.prototype.load).toHaveBeenCalledOnce()
    await waitFor(() => expect(onPlayError).toHaveBeenCalledWith(playError))

    setPaused(true)
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })

  it('should stop playback before releasing its media element', () => {
    const result = render(() => (
      <AudioPlayer.Root>
        <AudioPlayer.Media src="blob:audio" />
      </AudioPlayer.Root>
    ))
    const audio = result.container.querySelector('audio')

    if (audio === null) {
      throw new TypeError('Expected the headless audio element to render.')
    }

    fireEvent.play(audio)
    vi.mocked(HTMLMediaElement.prototype.pause).mockClear()
    result.unmount()

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce()
  })
})
