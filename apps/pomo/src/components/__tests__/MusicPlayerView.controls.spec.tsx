/** @vitest-environment jsdom */

import {cleanup} from '@solidjs/testing-library'
import {afterEach, describe, expect, it} from 'vitest'

import {renderMusicPlayerView} from './music-player-view.test-support'

describe('MusicPlayerView controls', () => {
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
    expect(
      controller.querySelector('[aria-label="앨범 추가"]')?.getAttribute('data-player-utility'),
    ).toBe('album')
    expect(
      controller.querySelector('[aria-label="플레이어 접기"]')?.getAttribute('data-player-utility'),
    ).toBe('expand')
  })

  it('should keep the summary play button stationary on hover', () => {
    const collapsedResult = renderMusicPlayerView({expanded: false})
    const summaryPlayButton = collapsedResult.container.querySelector('.pomo-player__play--summary')

    if (!(summaryPlayButton instanceof HTMLElement)) {
      throw new TypeError('Expected the Pomo summary play button to be rendered')
    }

    expect(summaryPlayButton.classList.contains('[&:hover]:translate-y-[-1px]')).toBe(false)
    expect(summaryPlayButton.classList.contains('[transition:filter_160ms_ease]')).toBe(true)

    cleanup()

    const expandedResult = renderMusicPlayerView()
    const expandedPlayButton = expandedResult.container.querySelector('.pomo-player__play--large')

    if (!(expandedPlayButton instanceof HTMLElement)) {
      throw new TypeError('Expected the Pomo expanded play button to be rendered')
    }

    expect(expandedPlayButton.classList.contains('[&:hover]:translate-y-[-1px]')).toBe(true)
    expect(
      expandedPlayButton.classList.contains('[transition:transform_160ms_ease,_filter_160ms_ease]'),
    ).toBe(true)
  })

  it('should replace the compact summary artwork with the collapsed play button', () => {
    const result = renderMusicPlayerView()
    const summary = result.container.querySelector('.pomo-player__summary')
    const summaryTitle = result.container.querySelector('.pomo-player__title')
    const transportPlayFrame = result.container.querySelector('.pomo-player__transport-play-frame')
    const summaryArtwork = result.container.querySelector('.pomo-player__artwork')
    const compactSummaryPlay = result.container.querySelector('.pomo-player__compact-summary-play')
    const summaryPlayButton = compactSummaryPlay?.querySelector('media-play-button')
    const summaryPlayIcon = summaryPlayButton?.querySelector('[slot="play"]')
    const summaryPauseIcon = summaryPlayButton?.querySelector('[slot="pause"]')

    for (const element of [
      transportPlayFrame,
      summary,
      summaryTitle,
      summaryArtwork,
      compactSummaryPlay,
      summaryPlayButton,
      summaryPlayIcon,
      summaryPauseIcon,
    ]) {
      expect(element).toBeInstanceOf(HTMLElement)
    }

    expect(transportPlayFrame?.classList.contains('player-compact:hidden')).toBe(true)
    expect(summary?.classList.contains('player-compact:gap-2')).toBe(true)
    expect(summaryTitle?.classList.contains('player-compact:px-1')).toBe(true)
    expect(summaryArtwork?.classList.contains('player-compact:hidden')).toBe(true)
    expect(compactSummaryPlay?.classList.contains('hidden')).toBe(true)
    expect(compactSummaryPlay?.classList.contains('player-compact:block')).toBe(true)
    expect(summaryPlayButton?.getAttribute('aria-label')).toBe('재생 또는 일시 정지')
    expect(summaryPlayButton?.classList.contains('pomo-player__play--summary')).toBe(true)
    expect(summaryPlayIcon?.classList.contains('size-6')).toBe(true)
    expect(summaryPauseIcon?.classList.contains('size-6')).toBe(true)

    cleanup()

    const withoutArtwork = renderMusicPlayerView({
      currentTrack: {
        artist: 'Artist',
        durationSeconds: 1,
        id: 'without-artwork',
        source: '/without-artwork.mp3',
        title: 'Without Artwork',
      },
    })

    expect(
      withoutArtwork.container.querySelector(
        '.pomo-player__compact-summary-play media-play-button',
      ),
    ).toBeInstanceOf(HTMLElement)
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
    expect(muteButton.classList.contains('player-compact:size-9')).toBe(true)
    expect(muteButton.classList.contains('[--media-control-padding:0.625rem]')).toBe(true)
    expect(volumeRange.classList.contains('pomo-player__volume')).toBe(true)
    expect(volumeRange.classList.contains('max-sm:hidden')).toBe(false)
    expect(volumeRange.getAttribute('aria-label')).toBe('음량 조절')
    expect(volumeRange.getAttribute('title')).toBe('음량 조절')
    expect(volumeRange.classList.contains('w-[clamp(3rem,_18cqi,_4.75rem)]')).toBe(true)
    expect(volumeRange.classList.contains('player-compact:min-w-6')).toBe(true)
    expect(volumeRange.classList.contains('player-compact:w-[clamp(1.5rem,_8cqi,_2rem)]')).toBe(
      true,
    )
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
