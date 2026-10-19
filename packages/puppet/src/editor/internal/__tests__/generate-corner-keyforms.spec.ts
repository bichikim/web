import {expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {isTwoDimensionalParameterBinding} from '../../../deformation'
import {addTwoDimensionalParameter} from '../parameter-keyforms'
import {generateCornerKeyforms} from '../generate-corner-keyforms'

const createSource = () => {
  const added = addTwoDimensionalParameter({
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
