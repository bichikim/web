import {describe, expect, test} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../player'
import {isTwoDimensionalParameterBinding} from '../parameter'
import {composeParameterPartProperties, getPartRenderProperties} from '../part-properties'

describe('part render properties', () => {
  test('should supply neutral render defaults for documents created before part properties', () => {
    const part = createDemoDocument().parts[0]!

    expect(getPartRenderProperties(part)).toEqual({
      blendMode: 'normal',
      clippingMaskIds: [],
      invertedMask: false,
      multiplyColor: [1, 1, 1],
      opacity: 1,
      renderWhenUsedAsMask: false,
      screenColor: [0, 0, 0],
    })
  })

  test('should interpolate opacity and colors from a connected parameter keyform', () => {
    const document = createDemoDocument()
    const binding = document.parameterBindings![0]!
    if (!isTwoDimensionalParameterBinding(binding)) {
      throw new Error('Expected a two-dimensional demo parameter')
    }
    const propertyDocument: PuppetDocument = {
      ...document,
      parameterBindings: [
        {
          ...binding,
          keyforms: binding.keyforms.map((keyform) => ({
            ...keyform,
            parts: keyform.parts.map((part) => ({
              ...part,
              properties: {
                multiplyColor: [1, 1, 1] as const,
                opacity: (keyform.values[0] + 30) / 60,
                screenColor: [0, 0, 0] as const,
              },
            })),
          })),
        },
      ],
    }

    expect(
      composeParameterPartProperties({
        document: propertyDocument,
        parameterValues: {'angle-x': 15, 'angle-y': 0},
        partId: 'mesh-preview',
      }),
    ).toMatchObject({opacity: 0.75})
  })
})
