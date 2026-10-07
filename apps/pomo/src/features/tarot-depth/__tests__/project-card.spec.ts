import {describe, expect, it} from 'vitest'
import {projectCard} from '../project-card'

describe('projectCard', () => {
  it('should fill the original two-to-three frame at rest', () => {
    expect(projectCard({height: 600, width: 400, x: 0, y: 0})).toEqual([
      0, 0, 400, 0, 400, 600, 0, 600,
    ])
  })

  it.each([-1, 1])(
    'should tilt with perspective while retaining all four corners in the viewport at %s',
    (x) => {
      const corners = projectCard({height: 600, width: 400, x, y: 1})
      expect(corners[1]).not.toBe(corners[3])
      for (let index = 0; index < corners.length; index += 2) {
        expect(corners[index]).toBeGreaterThanOrEqual(0)
        expect(corners[index]).toBeLessThanOrEqual(400)
        expect(corners[index + 1]).toBeGreaterThanOrEqual(0)
        expect(corners[index + 1]).toBeLessThanOrEqual(600)
      }
    },
  )

  it('should constrain input and preserve the reversed orientation', () => {
    expect(projectCard({height: 600, width: 400, x: 10, y: -10})).toEqual(
      projectCard({height: 600, width: 400, x: 1, y: -1}),
    )
    expect(projectCard({height: 600, reversed: true, width: 400, x: 0, y: 0})).toEqual([
      400, 600, 0, 600, 0, 0, 400, 0,
    ])
  })
})
