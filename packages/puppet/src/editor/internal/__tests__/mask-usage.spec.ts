import {describe, expect, it} from 'vitest'

import {createDemoDocument} from '../../../player'
import {getMaskUsageCount} from '../mask-usage'

describe('getMaskUsageCount', () => {
  it('should count parts that reference the requested part as a clipping mask', () => {
    const document = createDemoDocument()

    expect(getMaskUsageCount(document, 'mesh-preview')).toBe(2)
    expect(getMaskUsageCount(document, 'missing-part')).toBe(0)
  })
})
