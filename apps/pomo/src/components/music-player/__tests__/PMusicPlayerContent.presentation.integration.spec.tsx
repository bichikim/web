/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {PMusicPlayerContent} from '../PMusicPlayerContent'
import {TRACKS} from './test-support/player-fixtures'

vi.mock('media-chrome', () => ({}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('PMusicPlayerContent presentation integration', () => {
  it('should notify a controlled owner when the player expansion changes', () => {
    const [expanded, setExpanded] = createSignal(false)
    const handleExpandedChange = vi.fn((nextExpanded: boolean) => setExpanded(nextExpanded))

    render(() => (
      <PMusicPlayerContent
        expanded={expanded()}
        onExpandedChange={handleExpandedChange}
        tracks={TRACKS}
      />
    ))
    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))

    expect(handleExpandedChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', {name: '플레이어 접기'})).toBeTruthy()
  })

  it('should render expanded and compact play controls when expanded', () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)

    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))

    expect(result.container.querySelector('media-time-display')).toBeNull()
    const expandedPlayButton = result.container.querySelector(
      '.pomo-player__transport-play-frame media-play-button',
    )
    const compactPlayButton = result.container.querySelector(
      '.pomo-player__compact-summary-play media-play-button',
    )

    for (const playButton of [expandedPlayButton, compactPlayButton]) {
      expect(playButton).toBeInstanceOf(HTMLElement)
      expect(playButton?.hasAttribute('notooltip')).toBe(true)
      expect(playButton?.getAttribute('aria-label')).toBe('재생')
    }
  })

  it('should replace the summary play button without a collapse animation when expanded', () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const summary = result.container.querySelector('.pomo-player__summary')
    const summaryPlayFrame = summary?.querySelector(':scope > .pomo-player__play-summary-frame')

    if (!(summaryPlayFrame instanceof HTMLElement)) {
      throw new TypeError('Expected the Pomo summary play button frame to be rendered')
    }

    expect(summaryPlayFrame.classList.contains('w-11')).toBe(true)
    expect(
      summaryPlayFrame.classList.contains(
        '[transition:width_260ms_ease,_margin-right_260ms_ease,_opacity_180ms_ease]',
      ),
    ).toBe(false)

    fireEvent.click(screen.getByRole('button', {name: '플레이어 펼치기'}))

    expect(summary?.querySelector(':scope > .pomo-player__play-summary-frame')).toBeNull()
    expect(
      summary?.querySelector('.pomo-player__compact-summary-play .pomo-player__play-summary-frame'),
    ).toBeInstanceOf(HTMLElement)
  })
})
