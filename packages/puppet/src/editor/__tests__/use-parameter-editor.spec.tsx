/** @vitest-environment jsdom */
import {render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument, type PuppetDocument, type PuppetParameterBinding} from '../../player'
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
  expect(notice).toHaveBeenLastCalledWith(null)
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

test('should select a visible parameter instead of an internal physics output', () => {
  const initial = createDemoDocument()
  const visibleBinding = initial.parameterBindings![0]!
  const hiddenBinding: PuppetParameterBinding = {
    ...visibleBinding,
    id: 'physics-output-binding',
    keyforms: [],
    name: 'Internal physics output',
    parameterIds: ['physics-output'],
  }
  const [document, setDocument] = createSignal<PuppetDocument>({
    ...initial,
    parameterBindings: [hiddenBinding, ...initial.parameterBindings!],
    parameters: [
      {
        defaultValue: 0,
        id: 'physics-output',
        maximum: 1,
        minimum: -1,
        name: 'Internal physics output',
      },
      ...(initial.parameters ?? []),
    ],
    physics: {
      pendulums: [
        {
          damping: 1,
          gravity: 1,
          id: 'physics-test',
          inputParameterId: 'angle-x',
          inputScale: 1,
          length: 1,
          outputParameterId: 'physics-output',
          outputScale: 1,
        },
      ],
    },
  })
  let editor!: ParameterEditorResult
  render(() => {
    editor = useParameterEditor({
      document,
      onDocumentChange: setDocument,
      onNotice: vi.fn(),
      selectedNodeIds: () => ['mesh-preview'],
    })
    return <div />
  })

  expect(editor.activeBindingId()).toBe(visibleBinding.id)
  editor.setAllParametersVisible(true)
  editor.selectBinding(hiddenBinding.id)
  expect(editor.activeBindingId()).toBe(visibleBinding.id)
})
