import {describe, expect, test} from 'vitest'

import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetParameter,
} from '../../player/document'
import {resolveParameterValue} from '../../player/parameter-value'
import {parseDocumentValue} from '../../player/parse-document'
import {composeParameterVertices} from '../composition'
import {locateOneDimensionalKeyform} from '../parameter'

const angle: PuppetParameter = {
  defaultValue: 0,
  id: 'angle',
  maximum: 360,
  minimum: 0,
  name: 'Angle',
  repeat: true,
}

/** One vertex moved by keyforms at 0, 90 and 360 of a repeating angle. */
const createDocument = (parameter: PuppetParameter): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameterBindings: [
    {
      id: 'spin',
      keyforms: [
        {parts: [{partId: 'dot', vertices: [0, 0, 1, 0, 0, 1]}], values: [0]},
        {parts: [{partId: 'dot', vertices: [10, 0, 1, 0, 0, 1]}], values: [90]},
        {parts: [{partId: 'dot', vertices: [99, 0, 1, 0, 0, 1]}], values: [360]},
      ],
      parameterIds: [parameter.id],
      targetPartIds: ['dot'],
    },
  ],
  parameters: [parameter],
  parts: [
    {
      id: 'dot',
      mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
      texture: {height: 1, src: 'dot.png', width: 1},
    },
  ],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

const firstX = (document: PuppetDocument, value: number) =>
  composeParameterVertices({
    document,
    parameterValues: {angle: value},
    partId: 'dot',
    restVertices: [0, 0, 1, 0, 0, 1],
  })[0]

describe('parameter repeat', () => {
  test('should wrap values into the range, the maximum meaning the minimum', () => {
    expect(resolveParameterValue(angle, 360)).toBe(0)
    expect(resolveParameterValue(angle, 450)).toBe(90)
    expect(resolveParameterValue(angle, -90)).toBe(270)
    expect(resolveParameterValue({...angle, repeat: false}, 450)).toBe(360)
  })

  test('should blend the last keyform below the maximum into the first one', () => {
    expect(locateOneDimensionalKeyform([0, 90, 360], 45, [0, 360])).toEqual({
      from: 0,
      progress: 0.5,
      to: 1,
    })
    // 90..360 wraps to 0: the keyform at 360 is ignored.
    expect(locateOneDimensionalKeyform([0, 90, 360], 225, [0, 360])).toEqual({
      from: 1,
      progress: 0.5,
      to: 0,
    })
    // Before the first keyform: 45 is 405 one range later, between 180 and 90 + 360.
    const before = locateOneDimensionalKeyform([90, 180], 45, [0, 360])
    expect(before).toMatchObject({from: 1, to: 0})
    expect(before?.progress).toBeCloseTo(5 / 6)
  })

  test('should deform through the wrap instead of holding the last keyform', () => {
    const repeating = createDocument(angle)
    expect(firstX(repeating, 225)).toBeCloseTo(5)
    expect(firstX(repeating, 360 + 45)).toBeCloseTo(5)
    expect(firstX(createDocument({...angle, repeat: false}), 225)).toBeCloseTo(54.5)
  })

  test('should reject repeating option parameters', () => {
    expect(parseDocumentValue(createDocument(angle)).ok).toBe(true)
    expect(
      parseDocumentValue(
        createDocument({
          ...angle,
          options: [
            {label: 'A', value: 0},
            {label: 'B', value: 90},
          ],
        }),
      ).ok,
    ).toBe(false)
  })
})
