import {createKeyedParameter3D} from './parameter-keyforms/fixtures'
import {expect, test} from 'vitest'

import {withBindingKeyforms} from '../../../deformation'
import {createDemoDocument, parseDocumentValue, type PuppetDocument} from '../../../player'
import {generateCornerKeyforms} from '../generate-corner-keyforms'

const PLANE_SHIFT = 0.1

/** Each keyform moves even coordinates by x, odd ones by y, and all by a tenth of z. */
const shifted = (rest: ReadonlyArray<number>, values: ReadonlyArray<number>) =>
  rest.map(
    (value, index) =>
      value + (index % 2 === 0 ? values[0]! : values[1]!) + values[2]! * PLANE_SHIFT,
  )

/** A 3D binding with linear keyforms, keeping only those `keep` accepts. */
const createSource = (keep: (values: ReadonlyArray<number>) => boolean) => {
  const added = createKeyedParameter3D({
    document: {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []},
    nodeIds: ['mesh-preview'],
  })!
  const keyforms = added.binding.keyforms
    .filter((keyform) => keep(keyform.values))
    .map((keyform) => ({
      ...keyform,
      parts: keyform.parts.map((part) => ({
        ...part,
        vertices: shifted(part.vertices, keyform.values),
      })),
    }))
  return {
    bindingId: added.binding.id,
    document: {
      ...added.document,
      parameterBindings: [withBindingKeyforms(added.binding, keyforms)],
    } satisfies PuppetDocument,
    rest: added.document.parts.find((part) => part.id === 'mesh-preview')!.mesh.vertices,
  }
}

const isCorner = (values: ReadonlyArray<number>) => values[0] !== 0 && values[1] !== 0
const keyformAt = (document: PuppetDocument, values: ReadonlyArray<number>) =>
  document.parameterBindings![0]!.keyforms.find((keyform) =>
    keyform.values.every((value, index) => value === values[index]),
  )

test('should add new corners to every plane from that plane’s own forms', () => {
  const source = createSource((values) => !isCorner(values))
  const current = generateCornerKeyforms({...source, overwrite: false, plane: 0, planes: 'current'})
  if (!current.ok) {
    throw new Error(current.message)
  }
  expect(current.document.parameterBindings![0]!.keyforms).toHaveLength(19)
  expect(keyformAt(current.document, [30, 30, 0])).toBeDefined()
  expect(keyformAt(current.document, [30, 30, -30])).toBeUndefined()
  expect(parseDocumentValue(current.document).ok).toBe(true)

  const result = generateCornerKeyforms({...source, overwrite: false, planes: 'all'})
  if (!result.ok) {
    throw new Error(result.message)
  }
  expect(result.document.parameterBindings![0]!.keyforms).toHaveLength(27)
  for (const plane of [-30, 0, 30]) {
    expect(keyformAt(result.document, [30, -30, plane])?.parts[0]?.vertices).toEqual(
      shifted(source.rest, [30, -30, plane]),
    )
  }
  expect(parseDocumentValue(result.document).ok).toBe(true)
})

test('should regenerate only the exact selected Z plane', () => {
  const complete = createSource(() => true)
  const scrambled: PuppetDocument = {
    ...complete.document,
    parameterBindings: complete.document.parameterBindings.map((binding) =>
      withBindingKeyforms(
        binding,
        binding.keyforms.map((keyform) =>
          isCorner(keyform.values)
            ? {...keyform, parts: keyform.parts.map((part) => ({...part, vertices: complete.rest}))}
            : keyform,
        ),
      ),
    ),
  }
  const result = generateCornerKeyforms({
    ...complete,
    document: scrambled,
    overwrite: true,
    plane: 30,
    planes: 'current',
  })
  if (!result.ok) {
    throw new Error(result.message)
  }
  expect(keyformAt(result.document, [-30, 30, 30])?.parts[0]?.vertices).toEqual(
    shifted(complete.rest, [-30, 30, 30]),
  )
  expect(keyformAt(result.document, [-30, 30, 0])?.parts[0]?.vertices).toEqual(complete.rest)
})

test('should name the plane missing a reference form', () => {
  const source = createSource(
    (values) => !isCorner(values) && !(values[0] === 30 && values[2] === 0),
  )
  expect(generateCornerKeyforms({...source, overwrite: false, planes: 'all'})).toMatchObject({
    message: expect.stringContaining('평면 0'),
    ok: false,
  })
})

test('should not generate corners on a neighboring plane when current Z has no keys', () => {
  const source = createSource(() => true)
  expect(
    generateCornerKeyforms({...source, overwrite: true, plane: 20, planes: 'current'}),
  ).toMatchObject({message: expect.stringContaining('평면 20'), ok: false})
})
