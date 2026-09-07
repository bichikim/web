/** @vitest-environment jsdom */
import {render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../player'
import {type ParameterEditorResult, useParameterEditor} from '../use-parameter-editor'

test('should persist relations and allow keyform editing while their influence is reduced', () => {
  let editor!: ParameterEditorResult
  const initial = createDemoDocument()
  const [document, setDocument] = createSignal(initial)
  const notice = vi.fn()
  render(() => {
    editor = useParameterEditor({
      document,
      onDocumentChange: setDocument,
      onNotice: notice,
      selectedNodeIds: () => ['mesh-preview'],
    })
    return <div />
  })
  expect(editor.activeKeyformValues()).not.toBeNull()
  expect(
    editor.setInfluences([
      {
        parameterId: 'angle-y',
        points: [
          {value: 0, weight: 0.5},
          {value: 30, weight: 1},
        ],
      },
    ]),
  ).toBe(true)
  expect(editor.influence()).toBe(0.5)
  expect(editor.activeKeyformValues()).toEqual([0, 0])
  editor.setParameterValues([15, 0])
  editor.addKeyform()
  expect(editor.activeKeyformValues()).toEqual([15, 0])
  editor.setParameterValues([0, 30])
  expect(editor.influence()).toBe(1)
  expect(editor.activeKeyformValues()).toEqual([0, 30])
})

test('should keep preview changes outside document history and discard them', () => {
  let editor!: ParameterEditorResult
  const initial = createDemoDocument()
  const [document, setDocument] = createSignal(initial)
  const onDocumentChange = vi.fn(setDocument)
  render(() => {
    editor = useParameterEditor({
      document,
      onDocumentChange,
      onNotice: vi.fn(),
      selectedNodeIds: () => ['mesh-preview'],
    })
    return <div />
  })
  const influences = [{parameterId: 'angle-y', points: [{value: 0, weight: 0.25}]}]
  editor.previewInfluences(influences)
  expect(editor.influence()).toBe(0.25)
  expect(editor.previewDocument()).not.toBe(initial)
  expect(document()).toBe(initial)
  expect(onDocumentChange).not.toHaveBeenCalled()
  editor.previewInfluences(null)
  expect(editor.previewDocument()).toBe(initial)
  expect(editor.influence()).toBe(1)
  editor.previewInfluences(influences)
  expect(editor.setInfluences(influences)).toBe(true)
  editor.previewInfluences(null)
  expect(onDocumentChange).toHaveBeenCalledTimes(1)
  expect(editor.influence()).toBe(0.25)
})
