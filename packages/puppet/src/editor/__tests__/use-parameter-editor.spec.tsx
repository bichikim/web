import {isTwoDimensionalParameterBinding} from '../../deformation'
import {render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument, type PuppetDocument, type PuppetParameterBinding} from '../../player'
import {type ParameterEditorResult, useParameterEditor} from '../use-parameter-editor'
import {addGlue} from '../internal/glue'

test('should select and insert a Glue-only keyform from either endpoint part', () => {
  let editor!: ParameterEditorResult
  const initial: PuppetDocument = {
    ...addGlue(
      createDemoDocument(),
      {partId: 'mesh-preview', vertexIndex: 0},
      {partId: 'shape-diamond', vertexIndex: 0},
    )!,
    parameterBindings: [
      {
        id: 'join',
        keyforms: [-30, 30].map((value) => ({
          glue: [{id: 'glue-1', strength: (value + 30) / 60, weight: 0.5}],
          parts: [],
          values: [value],
        })),
        parameterIds: ['angle-x'],
        targetGlueIds: ['glue-1'],
      },
    ],
  }
  const [document, setDocument] = createSignal(initial)
  const [selection, setSelection] = createSignal(['mesh-preview'])
  render(() => {
    editor = useParameterEditor({
      document,
      onDocumentChange: setDocument,
      onNotice: vi.fn(),
      selectedNodeIds: selection,
    })
    return <div />
  })
  editor.setAllParametersVisible(false)
  expect(editor.activeBindingId()).toBe('join')
  setSelection(['shape-diamond'])
  expect(editor.activeBindingId()).toBe('join')
  expect(editor.activeTargetNodeIds()).toEqual(['mesh-preview', 'shape-diamond'])
  editor.setParameterValues([0])
  editor.addKeyform()
  expect(document().parameterBindings![0]!.keyforms[1]!.glue).toEqual([
    {id: 'glue-1', strength: 0.5, weight: 0.5},
  ])
  expect(editor.activeKeyformValues()).toEqual([0])
})

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

test('should select the mirrored destination and record one document change', () => {
  const [document, setDocument] = createSignal(createDemoDocument())
  const save = vi.fn(setDocument)
  let editor!: ParameterEditorResult
  render(() => {
    editor = useParameterEditor({
      document,
      onDocumentChange: save,
      onNotice: vi.fn(),
      selectedNodeIds: () => ['mesh-preview'],
    })
    return <div />
  })
  editor.selectKeyform([30, 0])
  expect(
    editor.mirrorKeyform({axis: 'x', center: 320, overwrite: true, parameterIndex: 0}),
  ).toBeNull()
  expect(save).toHaveBeenCalledTimes(1)
  expect(editor.activeKeyformValues()).toEqual([-30, 0])
  expect(editor.parameterValues()).toEqual([-30, 0])
})

test('should create four missing corners in one document change without moving the current value', () => {
  const initial = createDemoDocument()
  const [document, setDocument] = createSignal<PuppetDocument>({
    ...initial,
    parameterBindings: initial.parameterBindings!.map((binding) =>
      isTwoDimensionalParameterBinding(binding)
        ? {
            ...binding,
            keyforms: binding.keyforms.filter(
              (keyform) => keyform.values[0] === 0 || keyform.values[1] === 0,
            ),
          }
        : binding,
    ),
  })
  const save = vi.fn(setDocument)
  let editor!: ParameterEditorResult
  render(() => {
    editor = useParameterEditor({
      document,
      onDocumentChange: save,
      onNotice: vi.fn(),
      selectedNodeIds: () => ['mesh-preview'],
    })
    return <div />
  })
  expect(editor.generateCorners({overwrite: false})).toBeNull()
  expect(save).toHaveBeenCalledTimes(1)
  expect(document().parameterBindings![0]!.keyforms).toHaveLength(9)
  expect(editor.parameterValues()).toEqual([0, 0])
})

test('should insert an interpolated keyform for a group-only binding', () => {
  let editor!: ParameterEditorResult
  const initial: PuppetDocument = {
    ...createDemoDocument(),
    parameterBindings: [
      {
        id: 'group-only',
        keyforms: [-30, 30].map((value) => ({
          groups: [{groupId: 'shapes', properties: {opacity: (value + 30) / 60}}],
          parts: [],
          values: [value],
        })),
        parameterIds: ['angle-x'],
        targetGroupIds: ['shapes'],
      },
    ],
  }
  const [document, setDocument] = createSignal(initial)
  render(() => {
    editor = useParameterEditor({
      document,
      onDocumentChange: setDocument,
      onNotice: vi.fn(),
      selectedNodeIds: () => [],
    })
    return <div />
  })
  editor.setAllParametersVisible(true)
  editor.selectBinding('group-only')
  editor.setParameterValues([0])
  editor.addKeyform()
  expect(document().parameterBindings![0]!.keyforms).toHaveLength(3)
  expect(document().parameterBindings![0]!.keyforms[1]!.groups).toEqual([
    expect.objectContaining({
      groupId: 'shapes',
      properties: expect.objectContaining({opacity: 0.5}),
    }),
  ])
})
