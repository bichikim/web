import {describe, expect, it} from 'vitest'

import {roundedPolygon} from '../rounded-polygon'

describe('roundedPolygon', () => {
  it('should serialize padding and corner radii in CSS inset order', () => {
    expect(
      roundedPolygon({bottomLeft: 4, bottomRight: 3, padding: 5, topLeft: 1, topRight: 2}),
    ).toBe('inset(5px round 1px 2px 3px 4px)')
  })
})
