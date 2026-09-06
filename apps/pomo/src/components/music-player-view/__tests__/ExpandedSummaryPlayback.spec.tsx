/** @vitest-environment jsdom */
import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {ExpandedSummaryPlayback} from '../ExpandedSummaryPlayback'
vi.mock('media-chrome', () => ({}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should compose artwork and compact playback for the current track', () => {
  const view = render(() => (
    <ExpandedSummaryPlayback
      currentTrack={{
        artist: '가수',
        artworkUrl: '/cover.webp',
        durationSeconds: 10,
        id: 'one',
        source: '/one.mp3',
        title: '곡',
      }}
      sceneStyle="original"
    />
  ))
  expect(view.container.querySelector('img')).toHaveAttribute('src', '/cover.webp')
  expect(view.container.querySelector('.pomo-player__compact-summary-play')).toBeInTheDocument()
  expect(view.container.querySelector('media-play-button')).toBeInTheDocument()
})
