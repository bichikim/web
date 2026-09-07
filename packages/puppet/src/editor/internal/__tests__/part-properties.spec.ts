import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {setParameterKeyformPartProperties, setPartRenderProperties} from '../part-properties'

describe('part render property editing', () => {
  test('should merge static render properties into only the selected part', () => {
    const document = createDemoDocument()
    const updated = setPartRenderProperties({
      document,
      partId: 'mesh-preview',
      properties: {blendMode: 'screen', opacity: 0.4},
    })

    expect(updated?.parts[0]?.properties).toEqual({blendMode: 'screen', opacity: 0.4})
    expect(updated?.parts[1]?.properties).toEqual({clippingMaskIds: ['mesh-preview']})
    expect(
      setPartRenderProperties({document: updated!, partId: 'missing', properties: {opacity: 1}}),
    ).toBeUndefined()
  })

  test('should reject a clipping mask update that closes a cycle', () => {
    expect(
      setPartRenderProperties({
        document: createDemoDocument(),
        partId: 'mesh-preview',
        properties: {clippingMaskIds: ['shape-circle']},
      }),
    ).toBeUndefined()
  })

  test('should edit interpolated properties on the selected keyform without changing rest values', () => {
    const document = createDemoDocument()
    const updated = setParameterKeyformPartProperties({
      bindingId: 'angle-xy',
      document,
      partId: 'mesh-preview',
      properties: {
        multiplyColor: [0.5, 1, 1],
        opacity: 0.25,
        screenColor: [0, 0.25, 0],
      },
      values: [30, 0],
    })

    expect(updated?.parts[0]?.properties).toBeUndefined()
    expect(updated?.parameterBindings?.[0]?.keyforms[5]?.parts[0]?.properties).toEqual({
      multiplyColor: [0.5, 1, 1],
      opacity: 0.25,
      screenColor: [0, 0.25, 0],
    })
    expect(
      setParameterKeyformPartProperties({
        bindingId: 'angle-xy',
        document,
        partId: 'shape-circle',
        properties: {opacity: 0.5},
        values: [30, 0],
      }),
    ).toBeUndefined()
  })
})
