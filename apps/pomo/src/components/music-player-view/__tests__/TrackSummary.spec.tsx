/** @vitest-environment jsdom */
import {cleanup, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {TrackSummary} from '../TrackSummary'

afterEach(() => cleanup())

it('should expose the complete current track title in its tooltip and update it when the track changes', () => {
  const [currentTrack, setTrack] = createSignal({
    artist: 'Artist',
    durationSeconds: 1,
    id: 'title-one',
    source: '/one.mp3',
    title: '화면보다 긴 첫 번째 곡 제목',
  })
  const result = render(() => <TrackSummary currentTrack={currentTrack()} />)
  const title = result.container.querySelector('[data-pomo-player-title] p')
  expect(title).toHaveAttribute('data-pomo-tooltip-trigger', '')
  expect(title?.nextElementSibling).toHaveAttribute('role', 'tooltip')
  expect(title?.nextElementSibling).toHaveTextContent('화면보다 긴 첫 번째 곡 제목')
  setTrack({
    artist: 'Artist',
    durationSeconds: 1,
    id: 'title-two',
    source: '/two.mp3',
    title: '두 번째 곡 제목',
  })
  expect(title?.nextElementSibling).toHaveTextContent('두 번째 곡 제목')
})
