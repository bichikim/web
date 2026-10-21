import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'

import {createEmptyDocument, parseDocumentValue, type PuppetDocument} from '../../src/player'
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
