/** @vitest-environment jsdom */

import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {MusicPlayerView} from '../MusicPlayerView'

vi.mock('media-chrome', () => ({}))

const TRACKS = [
  {artist: 'Artist', durationSeconds: 1, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 1, id: 'two', source: '/two.mp3', title: 'Two'},
] as const

const renderMusicPlayerView = () =>
  render(() => (
    <MusicPlayerView
      currentIndex={0}
      currentTrack={TRACKS[0]}
      expanded={true}
      isPlaying={false}
      levels={[]}
      onAudioElement={vi.fn()}
      onExpandedChange={vi.fn()}
      onNextTrack={vi.fn()}
      onPreviousTrack={vi.fn()}
      onRepeatModeChange={vi.fn()}
      onShuffleChange={vi.fn()}
      onTrackSelect={vi.fn()}
      repeatMode="repeat-all"
      shuffleEnabled={true}
      tracks={TRACKS}
    />
  ))

describe('MusicPlayerView', () => {
  afterEach(() => cleanup())

  it('should use native titles for every player button', () => {
    const result = renderMusicPlayerView()
    const controller = result.container.querySelector('media-controller')

    if (!(controller instanceof HTMLElement)) {
      throw new TypeError('Expected the Pomo media controller to be rendered')
    }

    const buttons = controller.querySelectorAll('button, media-play-button, media-mute-button')
    const mediaButtons = controller.querySelectorAll('media-play-button, media-mute-button')

    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) {
      expect(button.getAttribute('title')?.trim()).toBeTruthy()
    }
    for (const button of mediaButtons) {
      expect(button.hasAttribute('notooltip')).toBe(true)
    }
    expect(controller.querySelector('media-mute-button')?.getAttribute('title')).toBe(
      '음소거 켜기/끄기',
    )
  })

  it('should keep the summary play button stationary on hover', () => {
    const result = renderMusicPlayerView()
    const summaryPlayButton = result.container.querySelector('.pomo-player__play--summary')
    const expandedPlayButton = result.container.querySelector('.pomo-player__play--large')

    if (
      !(summaryPlayButton instanceof HTMLElement) ||
      !(expandedPlayButton instanceof HTMLElement)
    ) {
      throw new TypeError('Expected the Pomo play buttons to be rendered')
    }

    expect(summaryPlayButton.classList.contains('[&:hover]:translate-y-[-1px]')).toBe(false)
    expect(summaryPlayButton.classList.contains('[transition:filter_160ms_ease]')).toBe(true)
    expect(expandedPlayButton.classList.contains('[&:hover]:translate-y-[-1px]')).toBe(true)
    expect(
      expandedPlayButton.classList.contains('[transition:transform_160ms_ease,_filter_160ms_ease]'),
    ).toBe(true)
  })

  it('should marquee the current track labels in the summary and playlist', () => {
    const result = renderMusicPlayerView()
    const summaryMarquees = result.container.querySelectorAll(
      '.pomo-player__title .pomo-overflow-marquee',
    )
    const currentTrackMarquees = result.container.querySelectorAll(
      ".pomo-player__track[aria-current='true'] .pomo-overflow-marquee",
    )
    const idleTrackMarquees = result.container.querySelectorAll(
      ".pomo-player__track:not([aria-current='true']) .pomo-overflow-marquee",
    )

    expect(summaryMarquees).toHaveLength(2)
    expect(currentTrackMarquees).toHaveLength(2)
    expect(idleTrackMarquees).toHaveLength(0)
    expect(currentTrackMarquees[0]?.hasAttribute('tabindex')).toBe(false)
    expect(currentTrackMarquees[1]?.hasAttribute('tabindex')).toBe(false)
    expect(
      result.container
        .querySelector(".pomo-player__track[aria-current='true']")
        ?.classList.contains('group'),
    ).toBe(true)
  })

  it('should reveal the volume thumb only while interacting with the range', () => {
    const result = renderMusicPlayerView()
    const muteButton = result.container.querySelector('media-mute-button')
    const volumeRange = result.container.querySelector('media-volume-range')
    const volumeGroup = result.container.querySelector('.pomo-player__volume-group')

    if (
      !(muteButton instanceof HTMLElement) ||
      !(volumeRange instanceof HTMLElement) ||
      !(volumeGroup instanceof HTMLElement)
    ) {
      throw new TypeError('Expected the Pomo volume controls to be rendered')
    }

    expect(volumeGroup.classList.contains('gap-0')).toBe(true)
    expect(muteButton.classList.contains('size-10')).toBe(true)
    expect(muteButton.classList.contains('[--media-control-padding:0.625rem]')).toBe(true)
    expect(volumeRange.classList.contains('pomo-player__volume')).toBe(true)
    expect(volumeRange.getAttribute('aria-label')).toBe('음량 조절')
    expect(volumeRange.getAttribute('title')).toBe('음량 조절')
    expect(volumeRange.classList.contains('w-[clamp(3.5rem,_9vw,_4.75rem)]')).toBe(true)
    expect(volumeRange.classList.contains('[--media-range-padding-left:0.25rem]')).toBe(true)
    expect(volumeRange.classList.contains('[--media-range-padding-right:0.25rem]')).toBe(true)
    expect(volumeRange.classList.contains('[--media-range-thumb-opacity:0]')).toBe(true)
    expect(volumeRange.classList.contains('hover:[--media-range-thumb-opacity:1]')).toBe(true)
    expect(volumeRange.classList.contains('focus-within:[--media-range-thumb-opacity:1]')).toBe(
      true,
    )
    expect(
      volumeRange.classList.contains('motion-reduce:[--media-range-thumb-transition:none]'),
    ).toBe(true)
  })
})
