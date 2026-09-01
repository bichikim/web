import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {
  addParameter,
  connectParameterParts,
  createParameterPreview,
  deleteParameter,
  deleteParameterKeyform,
  disconnectParameterParts,
  getParameterTargetPartIds,
  insertParameterKeyform,
  renameParameter,
  sampleParameterVertices,
  setParameterKeyformVertex,
} from '../parameter-keyforms'

describe('sampleParameterVertices', () => {
  test('should interpolate the whole vertex shape between adjacent keyforms', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const parameter = document.parameters?.[0]

    expect(
      sampleParameterVertices({
        parameter,
        partId: part.id,
        restVertices: part.mesh.vertices,
        value: 15,
      }).slice(-2),
    ).toEqual([352, 240])
    expect(part.mesh.vertices.slice(-2)).toEqual([320, 240])
  })

  test('should clamp outside values and retain unaffected parts', () => {
    const document = createDemoDocument()
    const preview = createParameterPreview({
      document,
      parameter: document.parameters?.[0],
      value: -100,
    })

    expect(preview.parts[0]?.mesh.vertices.slice(-2)).toEqual([256, 240])
    expect(preview.parts[1]?.mesh.vertices).toBe(document.parts[1]?.mesh.vertices)
    expect(preview.motions).toEqual([])
  })
})

describe('parameter keyform editing', () => {
  test('should add, rename, and remove an explicit parameter keyform', () => {
    const source = {...createDemoDocument(), parameters: []}
    const added = addParameter({document: source, partIds: ['mesh-preview']})

    expect(added?.parameter).toMatchObject({
      defaultValue: 0,
      id: 'parameter-1',
      maximum: 30,
      minimum: -30,
      name: 'Parameter 1',
    })

    const renamed = renameParameter({
      document: added!.document,
      name: 'Face Angle X',
      parameterId: added!.parameter.id,
    })
    const inserted = insertParameterKeyform({
      document: renamed!,
      parameterId: added!.parameter.id,
      value: 15,
    })

    expect(inserted?.parameters?.[0]?.name).toBe('Face Angle X')
    expect(inserted?.parameters?.[0]?.keyforms.map((keyform) => keyform.value)).toEqual([0, 15])

    const deleted = deleteParameterKeyform({
      document: inserted!,
      parameterId: added!.parameter.id,
      value: 15,
    })

    expect(deleted?.parameters?.[0]?.keyforms.map((keyform) => keyform.value)).toEqual([0])
  })

  test('should delete a parameter together with all of its keyforms', () => {
    const document = createDemoDocument()
    const deleted = deleteParameter({document, parameterId: 'angle-x'})

    expect(document.parameters?.[0]?.keyforms).toHaveLength(3)
    expect(deleted?.parameters).toEqual([])
    expect(deleteParameter({document, parameterId: 'missing'})).toBeUndefined()
  })

  test('should update only the selected keyform without changing rest vertices', () => {
    const document = createDemoDocument()
    const updated = setParameterKeyformVertex({
      document,
      parameterId: 'angle-x',
      partId: 'mesh-preview',
      value: 30,
      vertexIndex: 4,
      x: 400,
      y: 240,
    })

    expect(updated?.parts[0]?.mesh.vertices.slice(-2)).toEqual([320, 240])
    expect(updated?.parameters?.[0]?.keyforms[2]?.parts[0]?.vertices.slice(-2)).toEqual([400, 240])
    expect(updated?.parameters?.[0]?.keyforms[1]?.parts[0]?.vertices.slice(-2)).toEqual([320, 240])
  })

  test('should reject duplicate and out-of-range keyform values', () => {
    const document = createDemoDocument()

    expect(
      insertParameterKeyform({
        document,
        parameterId: 'angle-x',
        value: 0,
      }),
    ).toBeUndefined()
    expect(
      insertParameterKeyform({
        document,
        parameterId: 'angle-x',
        value: 31,
      }),
    ).toBeUndefined()
  })

  test('should connect and disconnect multiple parts across every keyform', () => {
    const document = createDemoDocument()
    const connected = connectParameterParts({
      document,
      parameterId: 'angle-x',
      partIds: ['shape-circle', 'shape-diamond'],
    })
    const connectedParameter = connected?.parameters?.[0]

    expect(connectedParameter).toBeDefined()
    expect(getParameterTargetPartIds(connectedParameter!)).toEqual([
      'mesh-preview',
      'shape-circle',
      'shape-diamond',
    ])
    expect(connectedParameter?.keyforms.every((keyform) => keyform.parts.length === 3)).toBe(true)

    const inserted = insertParameterKeyform({
      document: connected!,
      parameterId: 'angle-x',
      value: 15,
    })
    expect(inserted?.parameters?.[0]?.keyforms[2]?.parts).toHaveLength(3)

    const disconnected = disconnectParameterParts({
      document: inserted!,
      parameterId: 'angle-x',
      partIds: ['shape-circle', 'shape-diamond'],
    })
    const disconnectedParameter = disconnected?.parameters?.[0]

    expect(getParameterTargetPartIds(disconnectedParameter!)).toEqual(['mesh-preview'])
    expect(disconnectedParameter?.keyforms.every((keyform) => keyform.parts.length === 1)).toBe(
      true,
    )
  })
})
