import {createKeyedParameter2D} from './parameter-keyforms/fixtures'
import {expect, test} from 'vitest'
import {createDemoDocument, getDocumentScene} from '../../../player'
import {isTwoDimensionalParameterBinding, type PuppetParameterValues} from '../../../deformation'
import {connectParameterGroup, setKeyformGroupProperties} from '../group-keyforms'

import {generateCornerKeyforms} from '../generate-corner-keyforms'
import {convertSceneContainers} from '../container-conversion'
import {updateNode} from '../scene-tree'

test.each([
  [Math.PI * 2, 0.5],
  [0.6, 0.7],
])(
  'should compose rotation angles and geometry for corners with %s and %s',
  (horizontalAngle, verticalAngle) => {
    const converted = convertSceneContainers({
      document: createDemoDocument(),
      nodeIds: ['shapes'],
      targetKind: 'rotation',
    })!
    const document = {
      ...converted,
      parameterBindings: [],
      parameters: [],
      scene: {
        roots: updateNode(getDocumentScene(converted).roots, 'shapes', (node) => ({
          ...node,
          rotationAngle: 0,
        })),
      },
    }
    const added = createKeyedParameter2D({document, nodeIds: ['shapes']})!
    const binding = added.binding
    const keyforms = binding.keyforms
      .filter((form) => form.values[0] === 0 || form.values[1] === 0)
      .map((form) => {
        const rotationAngle =
          (form.values[0] / 30) * horizontalAngle + ((form.values[1] ?? 0) / 30) * verticalAngle
        return {
          ...form,
          deformers: form.deformers!.map((entry) => {
            const [x, y, endX, endY] = entry.controlPoints
            const dx = endX! - x!
            const dy = endY! - y!
            return {
              ...entry,
              controlPoints: [
                x!,
                y!,
                x! + dx * Math.cos(rotationAngle) - dy * Math.sin(rotationAngle),
                y! + dx * Math.sin(rotationAngle) + dy * Math.cos(rotationAngle),
              ],
              rotationAngle,
            }
          }),
        }
      })
    const result = generateCornerKeyforms({
      bindingId: binding.id,
      document: {...added.document, parameterBindings: [{...binding, keyforms} as typeof binding]},
      overwrite: false,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const corner = result.document.parameterBindings![0]!.keyforms.find(
        (form) => form.values[0] === 30 && form.values[1] === 30,
      )!
      const form = corner.deformers![0]!
      const angle = horizontalAngle + verticalAngle
      expect(form.rotationAngle).toBeCloseTo(angle)
      const [x, y, endX, endY] = binding.keyforms[0]!.deformers![0]!.controlPoints
      const length = Math.hypot(endX! - x!, endY! - y!)
      expect(form.controlPoints[2]).toBeCloseTo(form.controlPoints[0]! + Math.cos(angle) * length)
      expect(form.controlPoints[3]).toBeCloseTo(form.controlPoints[1]! + Math.sin(angle) * length)
    }
  },
)

const createSource = () => {
  const added = createKeyedParameter2D({
    document: {
      ...createDemoDocument(),
      parameterBindings: [],
      parameters: [],
    },
    nodeIds: ['mesh-preview'],
  })!
  const binding = added.binding
  if (!isTwoDimensionalParameterBinding(binding)) {
    throw new Error('Expected 2D binding')
  }
  const keyforms = binding.keyforms.map((keyform) => ({
    ...keyform,
    parts: keyform.parts.map((part) => ({
      ...part,
      vertices: part.vertices.map(
        (value, index) => value + (index % 2 === 0 ? keyform.values[0] : keyform.values[1]),
      ),
    })),
  }))
  return {
    bindingId: binding.id,
    document: {
      ...added.document,
      parameterBindings: [
        {
          ...binding,
          keyforms: keyforms.filter(
            (keyform) => keyform.values[0] === 0 || keyform.values[1] === 0,
          ),
        },
      ],
    },
  }
}

test('should synthesize four corners from independent axial forms without changing the center', () => {
  const source = createSource()
  const result = generateCornerKeyforms({...source, overwrite: false})
  expect(result.ok).toBe(true)
  if (!result.ok) {
    return
  }
  const binding = result.document.parameterBindings![0]!
  expect(binding.keyforms).toHaveLength(9)
  const rest = source.document.parts.find((part) => part.id === 'mesh-preview')!.mesh.vertices
  const corner = binding.keyforms.find(
    (keyform) => keyform.values[0] === 30 && keyform.values[1] === -30,
  )!
  expect(corner.parts[0]!.vertices).toEqual(
    rest.map((value, index) => value + (index % 2 === 0 ? 30 : -30)),
  )
  expect(binding.keyforms.find((keyform) => keyform.values.every((value) => value === 0))).toEqual(
    source.document.parameterBindings[0]!.keyforms.find((keyform) =>
      keyform.values.every((value) => value === 0),
    ),
  )
  expect(source.document.parameterBindings[0]!.keyforms).toHaveLength(5)
})

test('should preserve existing corners unless overwriting is selected', () => {
  const source = createSource()
  const generated = generateCornerKeyforms({...source, overwrite: false})
  if (!generated.ok) {
    throw new Error(generated.message)
  }
  const retained = generateCornerKeyforms({
    ...source,
    document: generated.document,
    overwrite: false,
  })
  expect(retained.ok).toBe(false)
  expect(
    generateCornerKeyforms({...source, document: generated.document, overwrite: true}).ok,
  ).toBe(true)
})

test('should reject missing axial forms without changing the document', () => {
  const source = createSource()
  const document = {
    ...source.document,
    parameterBindings: source.document.parameterBindings.map((binding) => ({
      ...binding,
      keyforms: binding.keyforms.slice(1),
    })),
  }
  expect(generateCornerKeyforms({...source, document, overwrite: true}).ok).toBe(false)
})

test('should compose group opacity deltas into corners, clamped to 0..1', () => {
  const source = createSource()
  const keys: ReadonlyArray<{opacity: number; values: PuppetParameterValues}> = [
    {opacity: 0.8, values: [30, 0]},
    {opacity: 0.7, values: [0, -30]},
    {opacity: 0.1, values: [0, 30]},
  ]
  const keyed = keys.reduce(
    (document, {opacity, values}) =>
      setKeyformGroupProperties({
        bindingId: source.bindingId,
        document,
        groupId: 'shapes',
        properties: {opacity},
        values,
      })!,
    connectParameterGroup(source.document, source.bindingId, 'shapes')!,
  )
  const result = generateCornerKeyforms({...source, document: keyed, overwrite: false})
  if (!result.ok) {
    throw new Error(result.message)
  }
  const opacityAt = (values: readonly number[]) =>
    result.document
      .parameterBindings![0]!.keyforms.find(
        (keyform) => keyform.values[0] === values[0] && keyform.values[1] === values[1],
      )
      ?.groups?.find((entry) => entry.groupId === 'shapes')?.properties.opacity
  expect(opacityAt([30, -30])).toBeCloseTo(0.5)
  expect(opacityAt([30, 30])).toBe(0)
})

test('should retain direct Glue channels when generating corners', () => {
  const base = createDemoDocument()
  const binding = base.parameterBindings![0]!
  if (!isTwoDimensionalParameterBinding(binding)) {
    throw new Error('Expected demo XY binding')
  }
  const document = {
    ...base,
    glue: [
      {
        first: {partId: 'mesh-preview', vertexIndex: 0},
        id: 'join',
        second: {partId: 'shape-diamond', vertexIndex: 0},
        strength: 1,
        weight: 0.5,
      },
    ],
    parameterBindings: [
      {
        ...binding,
        keyforms: binding.keyforms
          .filter((form) => form.values[0] === 0 || form.values[1] === 0)
          .map((form) => ({...form, glue: [{id: 'join', strength: 0.4, weight: 0.3}]})),
        targetGlueIds: ['join'],
      },
    ],
  }
  const result = generateCornerKeyforms({
    bindingId: binding.id,
    document,
    overwrite: false,
    planes: 'current',
    reference: 'default',
  })
  expect(result.ok).toBe(true)
  if (!result.ok) {
    return
  }
  const corner = result.document.parameterBindings![0]!.keyforms.find(
    (form) => form.values[0] === 30 && form.values[1] === 30,
  )!
  expect(corner.glue).toEqual([{id: 'join', strength: 0.4, weight: 0.3}])
})
