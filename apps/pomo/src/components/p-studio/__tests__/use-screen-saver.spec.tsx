/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {useStudioScreenSaver} from '../use-screen-saver'

const screenSaverMocks = vi.hoisted(() => ({
  controller: {
    delay: vi.fn(() => '10m' as const),
    isActive: vi.fn(() => false),
    onDelayChange: vi.fn(),
    onDismiss: vi.fn(),
  },
}))

vi.mock('../../../features/screen-saver', () => ({
  useScreenSaver: () => screenSaverMocks.controller,
}))

it('should coordinate the state presented by the studio screen saver', () => {
  const view = renderHook(() => useStudioScreenSaver())
  const track = {
    artist: 'rainymonday',
    durationSeconds: 180,
    id: 'blue-sky-balcony',
    source: '/blue-sky-balcony.mp3',
    title: 'Blue Sky Balcony',
  }

  view.result.onMusicPlayingChange(true)
  view.result.onPomodoroPresentationChange({
    phaseLabel: '집중',
    statusLabel: '집중 중',
    timeLabel: '12:34',
  })
  view.result.onTrackChange(track)

  expect(view.result.isMusicPlaying()).toBe(true)
  expect(view.result.timer()).toEqual({status: '집중 중', time: '12:34'})
  expect(view.result.currentTrack()).toBe(track)
  expect(view.result.delay()).toBe('10m')

  view.cleanup()
})
