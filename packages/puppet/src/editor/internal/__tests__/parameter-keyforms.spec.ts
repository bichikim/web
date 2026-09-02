import {describe, expect, test} from 'vitest'

import {parameterValuesEqual} from '../../../deformation'
import {createDemoDocument} from '../../../player'
import {
  addParameter,
  addTwoDimensionalParameter,
  connectParameterParts,
  createParameterPreview,
  deleteParameter,
  deleteParameterKeyform,
  disconnectParameterParts,
  getDocumentParameterBindings,
  getParameterTargetPartIds,
  insertParameterKeyform,
  moveParameterKeyform,
  renameParameter,
  setParameterKeyformVertex,
} from '../parameter-keyforms'

describe('parameter keyform editing', () => {
  test('should add, rename, and remove a one-dimensional keyform', () => {
    const source = {...createDemoDocument(), parameterBindings: [], parameters: []}
    const added = addParameter({document: source, partIds: ['mesh-preview']})
    const binding = added?.binding

    expect(binding).toMatchObject({id: 'parameter-1', parameterIds: ['parameter-1']})
    expect(added?.document.parameters?.[0]).toMatchObject({
      defaultValue: 0,
      maximum: 30,
      minimum: -30,
      name: 'Parameter 1',
    })

    const renamed = renameParameter({
      bindingId: binding!.id,
      document: added!.document,
      name: 'Face Angle X',
    })
    const inserted = insertParameterKeyform({
      bindingId: binding!.id,
      document: renamed!,
      values: [15],
    })

    expect(inserted?.parameters?.[0]?.name).toBe('Face Angle X')
    expect(inserted?.parameterBindings?.[0]?.keyforms.map((keyform) => keyform.values)).toEqual([
      [0],
      [15],
    ])

    const deleted = deleteParameterKeyform({
      bindingId: binding!.id,
      document: inserted!,
      values: [15],
    })
    expect(deleted?.parameterBindings?.[0]?.keyforms.map((keyform) => keyform.values)).toEqual([
      [0],
    ])
  })

  test('should create a complete three-by-three two-dimensional grid', () => {
    const source = {...createDemoDocument(), parameterBindings: [], parameters: []}
    const added = addTwoDimensionalParameter({document: source, partIds: ['mesh-preview']})

    expect(added?.document.parameters?.map((parameter) => parameter.name)).toEqual([
      'Parameter 1 X',
      'Parameter 1 Y',
    ])
    expect(added?.binding.parameterIds).toHaveLength(2)
    expect(added?.binding.keyforms.map((keyform) => keyform.values)).toEqual([
      [-30, -30],
      [0, -30],
      [30, -30],
      [-30, 0],
      [0, 0],
      [30, 0],
      [-30, 30],
      [0, 30],
      [30, 30],
    ])
  })

  test('should create a unique two-dimensional binding ID for an imported document', () => {
    const source = {...createDemoDocument(), parameterBindings: [], parameters: []}
    const conflictingDocument = {
      ...source,
      parameterBindings: [
        {
          id: 'parameter-2-parameter-3',
          keyforms: [],
          parameterIds: ['existing'] as const,
          targetPartIds: [],
        },
      ],
      parameters: [{defaultValue: 0, id: 'existing', maximum: 1, minimum: -1, name: 'Existing'}],
    }
    const added = addTwoDimensionalParameter({
      document: conflictingDocument,
      partIds: ['mesh-preview'],
    })

    expect(added?.binding.id).toBe('parameter-2-parameter-3-2')
    expect(added?.document.parameterBindings?.map((binding) => binding.id)).toEqual([
      'parameter-2-parameter-3',
      'parameter-2-parameter-3-2',
    ])
  })

  test('should add and remove an individual two-dimensional keyform', () => {
    const document = createDemoDocument()
    const inserted = insertParameterKeyform({
      bindingId: 'angle-xy',
      document,
      values: [15, 15],
    })
    const insertedBinding = inserted?.parameterBindings?.[0]

    expect(insertedBinding?.keyforms).toHaveLength(10)
    expect(
      insertedBinding?.keyforms
        .find((keyform) => keyform.values[0] === 15 && keyform.values[1] === 15)
        ?.parts[0]?.vertices.slice(-2),
    ).toEqual([352, 272])

    const deleted = deleteParameterKeyform({
      bindingId: 'angle-xy',
      document: inserted!,
      values: [15, 15],
    })

    expect(deleted?.parameterBindings?.[0]?.keyforms).toHaveLength(9)
    expect(
      deleted?.parameterBindings?.[0]?.keyforms.some(
        (keyform) => keyform.values[0] === 15 && keyform.values[1] === 15,
      ),
    ).toBe(false)
  })

  test('should delete a binding together with its scalar parameter definitions', () => {
    const document = createDemoDocument()
    const deleted = deleteParameter({bindingId: 'angle-xy', document})

    expect(document.parameterBindings?.[0]?.keyforms).toHaveLength(9)
    expect(deleted?.parameterBindings).toEqual([])
    expect(deleted?.parameters).toEqual([])
    expect(deleted?.motions[0]?.tracks).toEqual([])
    expect(deleteParameter({bindingId: 'missing', document})).toBeUndefined()
  })

  test('should retain parameter definitions referenced by another binding', () => {
    const document = createDemoDocument()
    const sharedBinding = {
      id: 'angle-x-secondary',
      keyforms: [],
      parameterIds: ['angle-x'] as const,
      targetPartIds: [],
    }
    const withSharedBinding = {
      ...document,
      motions: document.motions.map((motion) => ({
        ...motion,
        tracks: [
          ...motion.tracks,
          {keyframes: [{time: 0, value: 0}], kind: 'parameter' as const, parameterId: 'angle-x'},
        ],
      })),
      parameterBindings: [...(document.parameterBindings ?? []), sharedBinding],
    }
    const deleted = deleteParameter({bindingId: 'angle-xy', document: withSharedBinding})

    expect(deleted?.parameterBindings).toEqual([sharedBinding])
    expect(deleted?.parameters?.map((parameter) => parameter.id)).toEqual(['angle-x'])
    expect(deleted?.motions[0]?.tracks).toEqual([
      {keyframes: [{time: 0, value: 0}], kind: 'parameter', parameterId: 'angle-x'},
    ])
  })

  test('should update only the selected two-dimensional keyform', () => {
    const document = createDemoDocument()
    const updated = setParameterKeyformVertex({
      bindingId: 'angle-xy',
      document,
      partId: 'mesh-preview',
      values: [30, 0],
      vertexIndex: 4,
      x: 400,
      y: 240,
    })
    const binding = updated?.parameterBindings?.[0]

    expect(updated?.parts[0]?.mesh.vertices.slice(-2)).toEqual([320, 240])
    expect(
      binding?.keyforms
        .find((keyform) => keyform.values[0] === 30 && keyform.values[1] === 0)
        ?.parts[0]?.vertices.slice(-2),
    ).toEqual([400, 240])
    expect(
      binding?.keyforms
        .find((keyform) => keyform.values[0] === 0 && keyform.values[1] === 0)
        ?.parts[0]?.vertices.slice(-2),
    ).toEqual([320, 240])
  })

  test('should reject duplicate and out-of-range keyform values', () => {
    const document = createDemoDocument()

    expect(
      insertParameterKeyform({
        bindingId: 'angle-xy',
        document,
        values: [0, 0],
      }),
    ).toBeUndefined()
    expect(
      insertParameterKeyform({
        bindingId: 'angle-xy',
        document,
        values: [31, 0],
      }),
    ).toBeUndefined()
  })

  test('should move a keyform without changing its deformation data', () => {
    const document = createDemoDocument()
    const binding = document.parameterBindings?.[0]
    const originalKeyform = binding?.keyforms.find((keyform) =>
      keyform.values.every((value) => value === 0),
    )
    const moved = moveParameterKeyform({
      bindingId: 'angle-xy',
      document,
      nextValues: [15, 0],
      values: [0, 0],
    })
    const movedBinding = moved?.parameterBindings?.[0]

    expect(
      movedBinding?.keyforms.some((keyform) => parameterValuesEqual(keyform.values, [15, 0])),
    ).toBe(true)
    expect(
      movedBinding?.keyforms.find((keyform) => parameterValuesEqual(keyform.values, [15, 0]))
        ?.parts,
    ).toBe(originalKeyform?.parts)
    expect(binding?.keyforms.some((keyform) => parameterValuesEqual(keyform.values, [0, 0]))).toBe(
      true,
    )
    expect(
      moveParameterKeyform({
        bindingId: 'angle-xy',
        document,
        nextValues: [0, 0],
        values: [0, 0],
      }),
    ).toBe(document)
  })

  test('should reject a keyform move onto an occupied or invalid value', () => {
    const document = createDemoDocument()

    expect(
      moveParameterKeyform({
        bindingId: 'angle-xy',
        document,
        nextValues: [30, 0],
        values: [0, 0],
      }),
    ).toBeUndefined()
    expect(
      moveParameterKeyform({
        bindingId: 'angle-xy',
        document,
        nextValues: [31, 0],
        values: [0, 0],
      }),
    ).toBeUndefined()
    expect(
      moveParameterKeyform({
        bindingId: 'angle-xy',
        document,
        nextValues: [Number.NaN, 0],
        values: [0, 0],
      }),
    ).toBeUndefined()
    expect(
      moveParameterKeyform({
        bindingId: 'angle-xy',
        document,
        nextValues: [15, 0],
        values: [15, 0],
      }),
    ).toBeUndefined()
  })

  test('should connect and disconnect parts across every grid keyform', () => {
    const document = createDemoDocument()
    const connected = connectParameterParts({
      bindingId: 'angle-xy',
      document,
      partIds: ['shape-circle', 'shape-diamond'],
    })
    const connectedBinding = connected?.parameterBindings?.[0]

    expect(connectedBinding).toBeDefined()
    expect(getParameterTargetPartIds(connectedBinding!)).toEqual([
      'mesh-preview',
      'shape-circle',
      'shape-diamond',
    ])
    expect(connectedBinding?.keyforms.every((keyform) => keyform.parts.length === 3)).toBe(true)

    const disconnected = disconnectParameterParts({
      bindingId: 'angle-xy',
      document: connected!,
      partIds: ['shape-circle', 'shape-diamond'],
    })
    const disconnectedBinding = disconnected?.parameterBindings?.[0]
    expect(getParameterTargetPartIds(disconnectedBinding!)).toEqual(['mesh-preview'])
    expect(disconnectedBinding?.keyforms.every((keyform) => keyform.parts.length === 1)).toBe(true)
  })
})

describe('createParameterPreview', () => {
  test('should bake the selected two-dimensional values without changing rest vertices', () => {
    const document = createDemoDocument()
    const preview = createParameterPreview({
      document,
      parameterValues: {'angle-x': 15, 'angle-y': -15},
    })

    expect(preview.parts[0]?.mesh.vertices.slice(-2)).toEqual([352, 208])
    expect(document.parts[0]?.mesh.vertices.slice(-2)).toEqual([320, 240])
    expect(preview.parts[1]?.mesh.vertices).toBe(document.parts[1]?.mesh.vertices)
    expect(preview.motions).toEqual([])
    expect(preview.parameterBindings).toEqual([])
    expect(preview.parameters).toEqual([])
  })
})
