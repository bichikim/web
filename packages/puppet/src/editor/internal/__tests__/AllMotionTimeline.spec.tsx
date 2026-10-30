/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'
import {createDemoDocument, type PuppetDocument} from '../../../player'
import {AllMotionTimeline} from '../AllMotionTimeline'

afterEach(cleanup)

test('should display sampled model and group opacity in the all-motion view', () => {
  const source = createDemoDocument()
  const document: PuppetDocument = {
    ...source,
    motions: [
      {
        duration: 1,
        id: 'opacity',
        tracks: [
          {keyframes: [{time: 0, value: 0.25}], kind: 'model', target: 'opacity'},
          {groupId: 'shapes', keyframes: [{time: 0, value: 0.75}], kind: 'group-opacity'},
        ],
      },
    ],
  }
  const view = render(() => (
    <AllMotionTimeline
      document={document}
      framesPerSecond={24}
      getCurrentTime={() => 0}
      titleId="timeline"
      onViewChange={() => {}}
    />
  ))
  expect(view.getByRole('spinbutton', {name: '모델 불투명도 현재 값'})).toHaveValue(0.25)
  expect(view.getByRole('spinbutton', {name: 'Shapes 불투명도 현재 값'})).toHaveValue(0.75)
})

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
