/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {AllMotionTimeline} from '../AllMotionTimeline'

afterEach(cleanup)

test('should retain the group and numeric input focus while editing a motion duration', () => {
  const [document, setDocument] = createSignal(createDemoDocument())
  const view = render(() => (
    <AllMotionTimeline
      document={document()}
      framesPerSecond={24}
      getCurrentTime={() => 0}
      titleId="timeline"
      onViewChange={() => {}}
      onDurationChange={(motionId, duration) =>
        setDocument({
          ...document(),
          motions: document().motions.map((motion) =>
            motion.id === motionId ? {...motion, duration} : motion,
          ),
        })
      }
    />
  ))
  const group = view.getByRole('region', {name: 'idle-deform 타임라인'})
  const input = view.getByRole('spinbutton', {name: 'idle-deform 모션 길이'})
  input.focus()
  fireEvent.input(input, {target: {value: '3'}})
  expect(document().motions[0]?.duration).toBe(3)
  expect(view.getByRole('region', {name: 'idle-deform 타임라인'})).toBe(group)
  expect(input).toHaveFocus()
  fireEvent.input(input, {target: {value: '3.5'}})
  expect(document().motions[0]?.duration).toBe(3.5)
})
