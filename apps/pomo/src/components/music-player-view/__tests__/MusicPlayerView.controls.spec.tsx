/** @vitest-environment jsdom */

import {cleanup, within} from '@solidjs/testing-library'
import {afterEach, describe, expect, it} from 'vitest'

import {
  getPlayerShell,
  renderMusicPlayerView,
} from '../../__tests__/music-player-view.test-support.tsx'

const getElement = (parent: ParentNode | null | undefined, selector: string) => {
  const element = parent?.querySelector(selector)

  if (!(element instanceof HTMLElement)) {
    throw new TypeError(`Expected ${selector} to be rendered`)
  }

  return element
}

const getParent = (element: Element) => {
  if (!(element.parentElement instanceof HTMLElement)) {
    throw new TypeError('Expected the element parent to be rendered')
  }

  return element.parentElement
}

const getHTMLElement = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLElement)) {
    throw new TypeError('Expected an HTML element to be rendered')
  }

  return element
}

describe('MusicPlayerView controls', () => {
  afterEach(() => cleanup())

  it('should name player controls without tooltips when no provider is installed', () => {
    const result = renderMusicPlayerView()
    const controller = getPlayerShell(result.container)

    const controls = controller.querySelectorAll(
      'button, media-play-button, media-mute-button, media-time-range, media-volume-range',
    )
    const mediaButtons = controller.querySelectorAll('media-play-button, media-mute-button')

    expect(controls.length).toBeGreaterThan(0)
    for (const control of controls) {
      expect(control.hasAttribute('title')).toBe(false)
      expect(control.hasAttribute('data-pomo-tooltip-trigger')).toBe(false)
    }
    for (const button of mediaButtons) {
      expect(button.hasAttribute('notooltip')).toBe(true)
    }
    expect(result.getByRole('button', {name: '음량 조절'})).toBeInTheDocument()
    expect(result.getByRole('button', {name: '앨범 추가'})).toHaveAttribute(
      'data-player-utility',
      'album',
    )
    expect(result.getByRole('button', {name: '플레이어 접기'})).toHaveAttribute(
      'data-player-utility',
      'expand',
    )
  })

  it('should keep utility buttons at the primary utility size', () => {
    const result = renderMusicPlayerView()
    const utilityButtons =
      result.container.querySelectorAll<HTMLButtonElement>('[data-player-utility]')

    expect(utilityButtons).toHaveLength(2)
    for (const utilityButton of utilityButtons) {
      expect(utilityButton).toHaveClass('size-10')
    }
  })

  it('should keep the summary play button stationary on hover', () => {
    const collapsedResult = renderMusicPlayerView({expanded: false})
    const summaryPlayButton = collapsedResult.container
      .querySelector('[data-player-summary]')
      ?.querySelector('media-play-button')

    if (!(summaryPlayButton instanceof HTMLElement)) {
      throw new TypeError('Expected the Pomo summary play button to be rendered')
    }

    expect(summaryPlayButton.classList.contains('[&:hover]:translate-y-[-0.0625rem]')).toBe(false)
    expect(summaryPlayButton.classList.contains('[transition:filter_160ms_ease]')).toBe(true)

    cleanup()

    const expandedResult = renderMusicPlayerView()
    const expandedPlayButton = expandedResult
      .getByRole('button', {name: '이전 곡'})
      .parentElement?.querySelector('media-play-button')

    if (!(expandedPlayButton instanceof HTMLElement)) {
      throw new TypeError('Expected the Pomo expanded play button to be rendered')
    }

    expect(expandedPlayButton.classList.contains('[&:hover]:translate-y-[-0.0625rem]')).toBe(true)
    expect(
      expandedPlayButton.classList.contains('[transition:transform_160ms_ease,_filter_160ms_ease]'),
    ).toBe(true)
  })

  it('should keep player icons from shrinking in compact layouts', () => {
    const result = renderMusicPlayerView()
    const icons = Array.from(
      getPlayerShell(result.container).querySelectorAll<HTMLElement>('span[aria-hidden="true"]'),
    ).filter((element) => [...element.classList].some((name) => name.startsWith('i-')))

    expect(icons.length).toBeGreaterThan(0)
    for (const icon of icons) {
      expect(icon).toHaveClass('flex-none')
    }
  })

  it('should replace the compact summary artwork with the collapsed play button', () => {
    const result = renderMusicPlayerView()
    const summary = getElement(result.container, '[data-player-summary]')
    const summaryTitle = getElement(summary, '[data-pomo-player-title]')
    const transportPlayButton = getElement(
      getParent(result.getByRole('button', {name: '이전 곡'})),
      'media-play-button',
    )
    const transportPlayFrame = getParent(transportPlayButton)
    const summaryArtwork = getElement(summary, 'img')
    const compactSummaryPlay = getHTMLElement(summaryArtwork.nextElementSibling)
    const summaryPlayButton = getElement(compactSummaryPlay, 'media-play-button')
    const summaryPlayIcon = getElement(summaryPlayButton, '[slot="play"]')
    const summaryPauseIcon = getElement(summaryPlayButton, '[slot="pause"]')

    expect(transportPlayFrame?.classList.contains('player-compact:hidden')).toBe(true)
    expect(summary?.classList.contains('player-compact:gap-2')).toBe(true)
    expect(summaryTitle?.classList.contains('player-compact:px-1')).toBe(true)
    expect(summaryArtwork?.classList.contains('player-compact:hidden')).toBe(true)
    expect(compactSummaryPlay?.classList.contains('hidden')).toBe(true)
    expect(compactSummaryPlay?.classList.contains('player-compact:block')).toBe(true)
    expect(summaryPlayButton?.getAttribute('aria-label')).toBe('재생')
    expect(summaryPlayIcon?.classList.contains('size-6')).toBe(true)
    expect(summaryPauseIcon?.classList.contains('size-6')).toBe(true)
    expect(summaryPlayIcon?.classList.contains('flex-none')).toBe(true)
    expect(summaryPauseIcon?.classList.contains('flex-none')).toBe(true)

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
      getElement(
        getElement(withoutArtwork.container, '[data-player-summary]'),
        'media-play-button',
      ),
    ).toBeInstanceOf(HTMLElement)
  })

  it('should marquee the current track labels in the summary and playlist', () => {
    const result = renderMusicPlayerView()
    const summaryTitle = result.container.querySelector('[data-pomo-player-title]')
    const summaryMarquees = summaryTitle?.querySelectorAll(':scope > p > span')
    const playlist = result.getByRole('list')
    const trackButtons = within(playlist).getAllByRole('button')
    const currentTrack = trackButtons.find((track) => track.getAttribute('aria-current') === 'true')
    const currentTrackMarquees = [
      currentTrack?.children[1]?.firstElementChild,
      currentTrack?.children[2],
    ].filter((element): element is Element => element instanceof Element)
    const idleTrack = trackButtons.find((track) => track.getAttribute('aria-current') !== 'true')

    expect(summaryMarquees).toHaveLength(2)
    expect(currentTrackMarquees).toHaveLength(2)
    expect(idleTrack?.children[1]?.firstElementChild?.firstElementChild).toBeNull()
    expect(idleTrack?.children[2]?.firstElementChild).toBeNull()
    expect(currentTrackMarquees[0]?.hasAttribute('tabindex')).toBe(false)
    expect(currentTrackMarquees[1]?.hasAttribute('tabindex')).toBe(false)
    expect(currentTrack).toHaveClass('group')
  })

  it('should reveal the volume thumb only while interacting with the range', () => {
    const result = renderMusicPlayerView()
    const volumeRange = result.container.querySelector('media-volume-range')
    const trigger = result.getByRole('button', {name: '음량 조절'})

    expect(result.container.querySelector('media-mute-button')).toBeNull()
    expect(trigger).toHaveClass('grid')
    if (!(volumeRange instanceof HTMLElement)) {
      throw new TypeError('Expected the Pomo volume range to be rendered')
    }
    expect(volumeRange.closest('[popover]')).not.toBeNull()
    expect(volumeRange.getAttribute('aria-label')).toBe('음량 조절')
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
