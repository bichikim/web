import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../create-demo-document'
import {canUsePartAsMask} from '../part-mask'

describe('canUsePartAsMask', () => {
  test('should allow a mask chain and reject an edge that closes a cycle', () => {
    const source = createDemoDocument()
    const parts = source.parts.map((part) =>
      part.id === 'shape-diamond'
        ? {...part, properties: {clippingMaskIds: ['mesh-preview']}}
        : {...part, properties: undefined},
    )

    expect(canUsePartAsMask({maskPartId: 'shape-circle', partId: 'mesh-preview', parts})).toBe(true)
    expect(canUsePartAsMask({maskPartId: 'shape-diamond', partId: 'mesh-preview', parts})).toBe(
      false,
    )
  })
})
