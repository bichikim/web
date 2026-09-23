import {expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {addGlue} from '../glue'
import {removeParts} from '../remove-parts'

test('should remove a missing part and clean its masks, keyforms, animation and Glue', () => {
  const document = addGlue(
    createDemoDocument(),
    {partId: 'mesh-preview', vertexIndex: 0},
    {partId: 'shape-diamond', vertexIndex: 0},
  )!
  const result = removeParts(document, new Set(['mesh-preview']))
  expect(result.ok).toBe(true)
  if (!result.ok) {
    return
  }
  expect(result.document.parts).toHaveLength(2)
  expect(result.document.glue).toEqual([])
  expect(
    result.document.parts.every((part) => part.properties?.clippingMaskIds?.length === 0),
  ).toBe(true)
  expect(
    result.document.parameterBindings![0]!.keyforms.every((form) => form.parts.length === 0),
  ).toBe(true)
  expect(
    result.document.motions
      .flatMap((motion) => motion.tracks)
      .every((track) => track.kind !== 'vertex' || track.partId !== 'mesh-preview'),
  ).toBe(true)
})
