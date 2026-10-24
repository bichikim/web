import {describe, expect, test} from 'vitest'

import {mapBindingKeyforms, parameterValuesEqual} from '../../../deformation'
import {createDemoDocument, parseDocument, type PuppetParameterBinding2D} from '../../../player'
import {
  addParameter,
  addThreeDimensionalParameter,
  addTwoDimensionalParameter,
  connectParameterParts,
  createParameterPreview,
  deleteParameter,
  deleteParameterKeyform,
  disconnectParameterParts,
  getDocumentParameterBindings,
  getParameterBindingsForNodeIds,
  getParameterTargetPartIds,
  insertParameterKeyform,
  moveParameterKeyform,
  renameParameter,
  setParameterKeyformVertex,
} from '../parameter-keyforms'
import {
  connectParameterGroup,
  getKeyformGroupProperties,
  setKeyformGroupProperties,
} from '../group-keyforms'
import {updatePhysics} from '../physics'

describe('parameter keyform editing', () => {
  test('should remove layer rules when deleting their condition parameters', () => {
    const source = createDemoDocument()
    const document = {
      ...source,
      layerOrderRules: [
        {
          partIds: ['shape-circle'],
          placement: 'before' as const,
          referencePartId: 'mesh-preview',
          when: {comparison: 'greater-than' as const, parameterIds: ['angle-x'], threshold: 20},
        },
      ],
    }
    expect(
      deleteParameter({bindingId: source.parameterBindings![0]!.id, document})?.layerOrderRules,
    ).toEqual([])
  })

  test('should return the union of parameter bindings connected to selected nodes', () => {
    const document = createDemoDocument()
    const added = addParameter({document, nodeIds: ['shape-circle']})!

    expect(getParameterBindingsForNodeIds(added.document, ['mesh-preview'])).toEqual([
      document.parameterBindings![0],
    ])
    expect(getParameterBindingsForNodeIds(added.document, ['shape-circle'])).toEqual([
      added.binding,
    ])
    expect(
      getParameterBindingsForNodeIds(added.document, ['shape-circle', 'mesh-preview']),
    ).toEqual(added.document.parameterBindings)
    expect(getParameterBindingsForNodeIds(added.document, ['shape-diamond'])).toEqual([])
  })

  test('should add, rename, and remove a one-dimensional keyform', () => {
    const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
    const added = addParameter({document: source, nodeIds: ['mesh-preview']})
    const binding = added?.binding

    expect(binding).toMatchObject({id: 'parameter-1', keyforms: [], parameterIds: ['parameter-1']})
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
      [15],
    ])

    const deleted = deleteParameterKeyform({
      bindingId: binding!.id,
      document: inserted!,
      values: [15],
    })
    expect(deleted?.parameterBindings?.[0]?.keyforms).toEqual([])
  })

  test.each([
    {add: addParameter, values: [15] as const},
    {add: addTwoDimensionalParameter, values: [15, -10] as const},
    {add: addThreeDimensionalParameter, values: [15, -10, 7] as const},
  ])(
    'should create an empty parameter for $values and add only the requested keyform',
    ({add, values}) => {
      const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
      const added = add({document: source, nodeIds: ['mesh-preview']})!
      expect(added.document.parameters).toHaveLength(values.length)
      expect(added.binding.parameterIds).toHaveLength(values.length)
      expect(added.binding.keyforms).toEqual([])
      expect(added.binding.targetPartIds).toEqual(['mesh-preview'])
      expect(parseDocument(JSON.stringify(added.document)).ok).toBe(true)
      const preview = createParameterPreview({document: added.document, parameterValues: {}})
      expect(preview.parts[0]?.mesh.vertices).toEqual(source.parts[0]?.mesh.vertices)
      const inserted = insertParameterKeyform({
        bindingId: added.binding.id,
        document: added.document,
        values,
      })!
      expect(inserted.parameterBindings?.[0]?.keyforms.map((keyform) => keyform.values)).toEqual([
        values,
      ])
      expect(inserted.parameterBindings?.[0]?.keyforms[0]?.parts[0]?.vertices).toEqual(
        source.parts[0]?.mesh.vertices,
      )
      expect(parseDocument(JSON.stringify(inserted)).ok).toBe(true)
    },
  )

  test('should create a unique two-dimensional binding ID for an imported document', () => {
    const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
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
      nodeIds: ['mesh-preview'],
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

  test('should insert a keyform into a binding that keys only a group', () => {
    const connected = connectParameterGroup(createDemoDocument(), 'angle-xy', 'shapes')!
    const keyed = setKeyformGroupProperties({
      bindingId: 'angle-xy',
      document: connected,
      groupId: 'shapes',
      properties: {opacity: 0.2},
      values: [30, 0],
    })!
    const document = {
      ...keyed,
      parameterBindings: keyed.parameterBindings!.map((binding) => ({
        ...mapBindingKeyforms(binding, (keyform) => ({...keyform, parts: []})),
        targetPartIds: [],
      })),
    }
    expect(parseDocument(JSON.stringify(document)).ok).toBe(true)
    const inserted = insertParameterKeyform({bindingId: 'angle-xy', document, values: [15, 0]})

    expect(inserted?.parameterBindings?.[0]?.keyforms).toHaveLength(10)
    expect(
      getKeyformGroupProperties(inserted!, 'angle-xy', [15, 0], 'shapes')?.opacity,
    ).toBeCloseTo(0.6)
    expect(parseDocument(JSON.stringify(inserted)).ok).toBe(true)
  })

  test('should delete a binding together with its scalar parameter definitions', () => {
    const document = createDemoDocument()
    const withPhysics = updatePhysics({document, operation: {kind: 'add'}})!
    const deleted = deleteParameter({bindingId: 'angle-xy', document: withPhysics})

    expect(document.parameterBindings?.[0]?.keyforms).toHaveLength(9)
    expect(deleted?.parameterBindings).toEqual([])
    expect(deleted?.parameters).toEqual([])
    expect(deleted?.motions[0]?.tracks).toEqual([])
    expect(deleted?.physics).toBeUndefined()
    expect(deleteParameter({bindingId: 'missing', document})).toBeUndefined()
  })

  test('should remove deleted parameter IDs from saved timeline rows', () => {
    const base = createDemoDocument()
    const document = {
      ...base,
      motions: base.motions.map((motion) => ({
        ...motion,
        timelineParameterIds: ['angle-x', 'angle-y'],
      })),
    }
    const deleted = deleteParameter({bindingId: 'angle-xy', document})!

    expect(deleted.motions.every((motion) => motion.timelineParameterIds?.length === 0)).toBe(true)
    expect(parseDocument(JSON.stringify(deleted)).ok).toBe(true)
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
    expect(preview.parameters).toEqual([
      {...document.parameters![0], defaultValue: 15},
      {...document.parameters![1], defaultValue: -15},
    ])
  })
})

test('should remove influence references when their source parameter is deleted', () => {
  const base = createDemoDocument()
  const source = base.parameterBindings![0]!
  const target = {
    ...source,
    id: 'independent',
    influences: [{parameterId: 'angle-y', points: [{value: 0, weight: 1}]}],
    keyforms: [],
    parameterIds: ['other'] as const,
  }
  const document = {
    ...base,
    parameterBindings: [...base.parameterBindings!, target],
    parameters: [
      ...base.parameters!,
      {defaultValue: 0, id: 'other', maximum: 1, minimum: 0, name: 'Other'},
    ],
  }
  const result = deleteParameter({bindingId: source.id, document})!
  expect(result.parameterBindings![0]!.influences).toEqual([])
})

test('should keep an imported grid editable after inserting or deleting a single keyform', () => {
  const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
  const added = addTwoDimensionalParameter({document: source, nodeIds: ['mesh-preview']})!
  const part = source.parts[0]!
  const binding: PuppetParameterBinding2D = {
    ...added.binding,
    interpolation: 'grid',
    keyforms: [
      [-30, -30],
      [-30, 30],
      [30, -30],
      [30, 30],
    ].map(([x, y]) => ({
      parts: [{partId: part.id, vertices: part.mesh.vertices}],
      values: [x!, y!] as const,
    })),
    parameterIds: [added.binding.parameterIds[0]!, added.binding.parameterIds[1]!],
  }
  const document = {...added.document, parameterBindings: [binding]}
  expect(parseDocument(JSON.stringify(document)).ok).toBe(true)
  const inserted = insertParameterKeyform({bindingId: binding.id, document, values: [0, 0]})!
  const deleted = deleteParameterKeyform({bindingId: binding.id, document, values: [-30, -30]})!
  expect(parseDocument(JSON.stringify(inserted)).ok).toBe(true)
  expect(parseDocument(JSON.stringify(deleted)).ok).toBe(true)
  expect(deleted.parameterBindings![0]!.keyforms).toHaveLength(3)
})
