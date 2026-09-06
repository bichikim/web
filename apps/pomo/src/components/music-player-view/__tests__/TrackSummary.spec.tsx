/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PTooltipContent, PTooltipProvider} from '../../tooltip'
import {TrackSummary} from '../TrackSummary'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('should expose the complete current track title in its tooltip and update it when the track changes', () => {
  vi.useFakeTimers()
  const [currentTrack, setTrack] = createSignal({
    artist: 'Artist',
    durationSeconds: 1,
    id: 'title-one',
    source: '/one.mp3',
    title: '화면보다 긴 첫 번째 곡 제목',
  })
  const result = render(() => (
    <PTooltipProvider>
      <TrackSummary currentTrack={currentTrack()} />
      <PTooltipContent />
    </PTooltipProvider>
  ))
  const title = result.container.querySelector('[data-pomo-player-title] p')
  expect(title).not.toHaveAttribute('title')
  fireEvent.pointerEnter(title!)
  vi.advanceTimersByTime(400)
  expect(title).toHaveAttribute('title', '화면보다 긴 첫 번째 곡 제목')
  setTrack({
    artist: 'Artist',
    durationSeconds: 1,
    id: 'title-two',
    source: '/two.mp3',
    title: '두 번째 곡 제목',
  })
  expect(title).toHaveAttribute('title', '두 번째 곡 제목')
})
