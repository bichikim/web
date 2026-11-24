import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'

import {
  createDemoDocument,
  createEmptyDocument,
  parseDocumentValue,
  type PuppetDocument,
} from '../../src/player'
import {EditorTimeline} from '../../src/editor/internal/EditorTimeline'

afterEach(cleanup)

test('should edit colliding parameter and model effect values independently in the timeline', () => {
  const [document, setDocument] = createSignal<PuppetDocument>({
    ...createEmptyDocument(),
    motions: [
      {
        duration: 1,
        id: 'motion',
        tracks: [
          {keyframes: [{time: 0, value: 8}], kind: 'parameter', parameterId: 'model:opacity'},
          {keyframes: [{time: 0, value: 0.5}], kind: 'model', target: 'opacity'},
        ],
      },
    ],
    parameters: [
      {defaultValue: 0, id: 'model:opacity', maximum: 10, minimum: 0, name: 'Parameter'},
    ],
  })
  const view = render(() => <EditorTimeline document={document()} onDocumentChange={setDocument} />)
  const parameter = view.getByRole('spinbutton', {name: 'Parameter 현재 값'})
  const effect = view.getByRole('spinbutton', {name: '모델 불투명도 현재 값'})
  expect(parameter).toHaveAttribute('aria-valuenow', '8')
  expect(effect).toHaveAttribute('aria-valuenow', '0.5')
  fireEvent.input(parameter, {target: {value: '7'}})
  fireEvent.input(effect, {target: {value: '0.25'}})
  expect(document().motions[0]?.tracks).toEqual([
    {keyframes: [{time: 0, value: 7}], kind: 'parameter', parameterId: 'model:opacity'},
    {keyframes: [{time: 0, value: 0.25}], kind: 'model', target: 'opacity'},
  ])
  expect(parseDocumentValue(document()).ok).toBe(true)
})

test('should release focus when a focused keyframe is deleted and another is inserted', () => {
  const [document, setDocument] = createSignal(createDemoDocument())
  const view = render(() => <EditorTimeline document={document()} onDocumentChange={setDocument} />)
  const removed = view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'})
  const retained = view.getByRole('button', {name: 'Angle Y 2.00초 키프레임'})
  removed.focus()
  expect(removed).toHaveFocus()

  setDocument((current) => ({
    ...current,
    motions: current.motions.map((motion, index) =>
      index === 0
        ? {
            ...motion,
            tracks: motion.tracks.map((track) =>
              'parameterId' in track && track.parameterId === 'angle-y'
                ? {
                    ...track,
                    keyframes: track.keyframes.map((frame) =>
                      frame.time === 1 ? {...frame, time: 1.5} : frame,
                    ),
                  }
                : track,
            ),
          }
        : motion,
    ),
  }))

  const inserted = view.getByRole('button', {name: 'Angle Y 1.50초 키프레임'})
  expect(removed).not.toBeInTheDocument()
  expect(inserted).not.toHaveFocus()
  expect(view.getByRole('button', {name: 'Angle Y 2.00초 키프레임'})).toBe(retained)
})
