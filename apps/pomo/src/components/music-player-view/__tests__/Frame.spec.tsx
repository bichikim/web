/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {Frame} from '../Frame'

afterEach(cleanup)

it('should preserve positional visualizer bars when their levels change or repeat', () => {
  const [levels, setLevels] = createSignal([10, 20, 30])
  render(() => (
    <Frame
      levels={levels()}
      currentTrack={undefined}
      expanded={false}
      isPreparing={false}
      onExpandedChange={() => undefined}
      isPlaying
      onPause={() => undefined}
    />
  ))
  const visualizer = screen.getByLabelText(m.player_audio_levels())
  const bars = [...visualizer.querySelectorAll('span')]
  expect(bars).toHaveLength(3)
  setLevels([30, 10, 30])
  visualizer.querySelectorAll('span').forEach((bar, index) => expect(bar).toBe(bars[index]))
  expect(bars.map((bar) => bar.style.getPropertyValue('--pomo-level-height'))).toEqual([
    '30%',
    '10%',
    '30%',
  ])
  setLevels([15, 25, 35])
  visualizer.querySelectorAll('span').forEach((bar, index) => expect(bar).toBe(bars[index]))
  expect(bars.map((bar) => bar.style.getPropertyValue('--pomo-level-height'))).toEqual([
    '15%',
    '25%',
    '35%',
  ])
})
