import {describe, expect, it} from 'vitest'
import {
  defaultSpatialNeighborOptions,
  EXCLUDED_SCORE,
  filterDirectionalCandidates,
  findNearestInDirection,
  horizontalOverlap,
  isDirectionalCandidate,
  normalizeBox,
  resolveSpatialNeighborOptions,
  scoreDirectionalCandidate,
  selectBestDirectionalCandidate,
  targetsExcept,
  verticalOverlap,
} from '../'
import type {Box, Direction} from '../types'

const box = (x: number, y: number, w: number, h: number): Box => ({h, w, x, y})

const boxWithId = (id: string, x: number, y: number, w: number, h: number) => ({
  h,
  id,
  w,
  x,
  y,
})

describe('spatial-neighbor', () => {
  describe('normalizeBox', () => {
    it('should derive edges and center from x, y, w, h', () => {
      expect(normalizeBox(box(10, 20, 30, 40))).toEqual({
        bottom: 60,
        cx: 25,
        cy: 40,
        left: 10,
        right: 40,
        top: 20,
      })
    })
  })

  describe('verticalOverlap', () => {
    it('should return negative value when boxes do not overlap vertically', () => {
      expect(
        verticalOverlap(normalizeBox(box(0, 0, 10, 10)), normalizeBox(box(0, 20, 10, 10))),
      ).toBe(-10)
    })

    it('should return zero when boxes touch edge-to-edge vertically', () => {
      expect(
        verticalOverlap(normalizeBox(box(0, 0, 10, 10)), normalizeBox(box(0, 10, 10, 10))),
      ).toBe(0)
    })

    it('should return overlap length when boxes overlap vertically', () => {
      expect(
        verticalOverlap(normalizeBox(box(0, 0, 10, 10)), normalizeBox(box(0, 5, 10, 10))),
      ).toBe(5)
    })
  })

  describe('horizontalOverlap', () => {
    it('should return negative value when boxes do not overlap horizontally', () => {
      expect(
        horizontalOverlap(normalizeBox(box(0, 0, 10, 10)), normalizeBox(box(20, 0, 10, 10))),
      ).toBe(-10)
    })

    it('should return zero when boxes touch edge-to-edge horizontally', () => {
      expect(
        horizontalOverlap(normalizeBox(box(0, 0, 10, 10)), normalizeBox(box(10, 0, 10, 10))),
      ).toBe(0)
    })

    it('should return overlap length when boxes overlap horizontally', () => {
      expect(
        horizontalOverlap(normalizeBox(box(0, 0, 10, 10)), normalizeBox(box(5, 0, 10, 10))),
      ).toBe(5)
    })
  })

  describe('resolveSpatialNeighborOptions', () => {
    it('should return defaults when options are omitted', () => {
      expect(resolveSpatialNeighborOptions()).toEqual(defaultSpatialNeighborOptions)
    })

    it('should merge partial options with defaults', () => {
      expect(resolveSpatialNeighborOptions({requireOverlap: false})).toEqual({
        angleLimit: defaultSpatialNeighborOptions.angleLimit,
        requireOverlap: false,
      })
      expect(resolveSpatialNeighborOptions({angleLimit: 1})).toEqual({
        angleLimit: 1,
        requireOverlap: defaultSpatialNeighborOptions.requireOverlap,
      })
    })
  })

  describe('targetsExcept', () => {
    it('should remove the source reference from targets', () => {
      const from = boxWithId('from', 0, 0, 10, 10)
      const other = boxWithId('other', 20, 0, 10, 10)

      expect(targetsExcept(from, [from, other])).toEqual([other])
    })

    it('should keep boxes at the same coordinates when reference differs', () => {
      const from = box(0, 0, 10, 10)
      const duplicateCoords = box(0, 0, 10, 10)

      expect(targetsExcept(from, [from, duplicateCoords])).toEqual([duplicateCoords])
    })

    it('should return an empty array when only the source is present', () => {
      const from = box(0, 0, 10, 10)

      expect(targetsExcept(from, [from])).toEqual([])
    })
  })

  describe('isDirectionalCandidate', () => {
    it('should accept right candidate with vertical overlap', () => {
      expect(isDirectionalCandidate(box(0, 0, 10, 10), box(20, 0, 10, 10), 'right')).toBe(true)
      expect(isDirectionalCandidate(box(0, 0, 10, 10), box(20, 20, 10, 10), 'right')).toBe(false)
    })

    it('should reject right candidate when target center is not to the right', () => {
      expect(isDirectionalCandidate(box(0, 0, 10, 10), box(-20, 0, 10, 10), 'right')).toBe(false)
      expect(isDirectionalCandidate(box(0, 0, 10, 10), box(0, 0, 10, 10), 'right')).toBe(false)
    })

    it('should accept left candidate with vertical overlap', () => {
      expect(isDirectionalCandidate(box(0, 0, 10, 10), box(-20, 0, 10, 10), 'left')).toBe(true)
      expect(isDirectionalCandidate(box(0, 0, 10, 10), box(-20, 20, 10, 10), 'left')).toBe(false)
    })

    it('should accept down candidate with horizontal overlap', () => {
      expect(isDirectionalCandidate(box(0, 0, 10, 10), box(0, 20, 10, 10), 'down')).toBe(true)
      expect(isDirectionalCandidate(box(0, 0, 10, 10), box(20, 20, 10, 10), 'down')).toBe(false)
    })

    it('should accept up candidate with horizontal overlap', () => {
      expect(isDirectionalCandidate(box(0, 0, 10, 10), box(0, -20, 10, 10), 'up')).toBe(true)
      expect(isDirectionalCandidate(box(0, 0, 10, 10), box(20, -20, 10, 10), 'up')).toBe(false)
    })

    it('should allow offset candidates when requireOverlap is false', () => {
      expect(
        isDirectionalCandidate(box(0, 0, 10, 10), box(20, 20, 10, 10), 'right', {
          requireOverlap: false,
        }),
      ).toBe(true)
    })

    it('should return false for an unsupported direction', () => {
      expect(
        isDirectionalCandidate(box(0, 0, 10, 10), box(20, 0, 10, 10), 'diagonal' as Direction),
      ).toBe(false)
    })
  })

  describe('filterDirectionalCandidates', () => {
    it('should keep only candidates in the requested direction', () => {
      const from = box(0, 0, 10, 10)
      const targets = [box(20, 0, 10, 10), box(-20, 0, 10, 10), box(20, 20, 10, 10)]

      expect(filterDirectionalCandidates(from, 'right', targets)).toEqual([targets[0]])
    })

    it('should return an empty array when no target matches', () => {
      expect(filterDirectionalCandidates(box(0, 0, 10, 10), 'right', [])).toEqual([])
      expect(
        filterDirectionalCandidates(box(0, 0, 10, 10), 'right', [box(-20, 0, 10, 10)]),
      ).toEqual([])
    })

    it('should forward options to overlap checks', () => {
      const from = box(0, 0, 10, 10)
      const offset = box(20, 20, 10, 10)

      expect(filterDirectionalCandidates(from, 'right', [offset], {requireOverlap: false})).toEqual(
        [offset],
      )
      expect(filterDirectionalCandidates(from, 'right', [offset])).toEqual([])
    })
  })

  describe('scoreDirectionalCandidate', () => {
    it('should prefer closer aligned candidates to the right', () => {
      const from = box(0, 0, 10, 10)
      const closeScore = scoreDirectionalCandidate(from, box(20, 0, 10, 10), 'right')
      const farScore = scoreDirectionalCandidate(from, box(100, 0, 10, 10), 'right')

      expect(closeScore).toBeGreaterThan(farScore)
    })

    it.each([
      ['left', box(-20, 0, 10, 10)],
      ['down', box(0, 20, 10, 10)],
      ['up', box(0, -20, 10, 10)],
    ] as const)('should score eligible %s candidates above excluded score', (direction, target) => {
      expect(scoreDirectionalCandidate(box(0, 0, 10, 10), target, direction)).toBeGreaterThan(
        EXCLUDED_SCORE,
      )
    })

    it('should return excluded score when target is behind the movement direction', () => {
      expect(scoreDirectionalCandidate(box(0, 0, 10, 10), box(-20, 0, 10, 10), 'right')).toBe(
        EXCLUDED_SCORE,
      )
      expect(scoreDirectionalCandidate(box(0, 0, 10, 10), box(20, 0, 10, 10), 'left')).toBe(
        EXCLUDED_SCORE,
      )
      expect(scoreDirectionalCandidate(box(0, 0, 10, 10), box(0, -20, 10, 10), 'down')).toBe(
        EXCLUDED_SCORE,
      )
      expect(scoreDirectionalCandidate(box(0, 0, 10, 10), box(0, 20, 10, 10), 'up')).toBe(
        EXCLUDED_SCORE,
      )
    })

    it('should exclude diagonal candidates beyond angle limit', () => {
      expect(scoreDirectionalCandidate(box(0, 0, 10, 10), box(20, 20, 10, 10), 'right')).toBe(
        EXCLUDED_SCORE,
      )
    })

    it('should allow steeper diagonals when angle limit is relaxed', () => {
      const steepDiagonalScore = scoreDirectionalCandidate(
        box(0, 0, 10, 10),
        box(20, 20, 10, 10),
        'right',
        2,
      )

      expect(steepDiagonalScore).toBeGreaterThan(EXCLUDED_SCORE)
    })
  })

  describe('selectBestDirectionalCandidate', () => {
    it('should return null for an empty target list', () => {
      expect(selectBestDirectionalCandidate(box(0, 0, 10, 10), 'right', [])).toBeNull()
    })

    it('should return null when every candidate is excluded by score', () => {
      expect(
        selectBestDirectionalCandidate(box(0, 0, 10, 10), 'right', [box(20, 20, 10, 10)]),
      ).toBeNull()
    })

    it('should pick the highest-scoring candidate', () => {
      const from = boxWithId('from', 0, 0, 10, 10)
      const targets = [boxWithId('far', 100, 0, 10, 10), boxWithId('close', 20, 0, 10, 10)]

      expect(selectBestDirectionalCandidate(from, 'right', targets)?.id).toBe('close')
    })

    it('should keep an eligible candidate whose finite score is very low', () => {
      const from = box(0, 0, 10, 10)
      const farTarget = box(1_000_000, 0, 10, 10)

      expect(selectBestDirectionalCandidate(from, 'right', [farTarget])).toBe(farTarget)
    })

    it('should respect a custom angle limit from options', () => {
      const from = box(0, 0, 10, 10)
      const offset = box(20, 5, 10, 10)

      expect(selectBestDirectionalCandidate(from, 'right', [offset], {angleLimit: 0.1})).toBeNull()
      expect(selectBestDirectionalCandidate(from, 'right', [offset], {angleLimit: 1})).toEqual(
        offset,
      )
    })
  })

  describe('findNearestInDirection', () => {
    it('should return null when no candidate exists', () => {
      expect(findNearestInDirection(box(0, 0, 10, 10), [box(-20, 0, 10, 10)], 'right')).toBeNull()
    })

    it('should return null when targets is empty', () => {
      expect(findNearestInDirection(box(0, 0, 10, 10), [], 'right')).toBeNull()
    })

    it('should exclude the source box by reference', () => {
      const from = boxWithId('from', 0, 0, 10, 10)
      const target = boxWithId('target', 20, 0, 10, 10)

      expect(findNearestInDirection(from, [from, target], 'right')?.id).toBe('target')
    })

    it('should pick the closest aligned candidate to the right', () => {
      const from = boxWithId('from', 0, 0, 10, 10)
      const targets = [
        boxWithId('far', 100, 0, 10, 10),
        boxWithId('close', 20, 0, 10, 10),
        boxWithId('offset', 50, 5, 10, 10),
      ]

      expect(findNearestInDirection(from, targets, 'right')?.id).toBe('close')
    })

    it('should prefer alignment over similar distance', () => {
      const from = boxWithId('from', 0, 0, 10, 10)
      const targets = [boxWithId('offset', 20, 10, 10, 10), boxWithId('aligned', 20, 0, 10, 10)]

      expect(findNearestInDirection(from, targets, 'right')?.id).toBe('aligned')
    })

    it.each([
      ['right', box(20, 0, 10, 10)],
      ['left', box(-20, 0, 10, 10)],
      ['down', box(0, 20, 10, 10)],
      ['up', box(0, -20, 10, 10)],
    ] as const)('should find candidate for %s direction', (direction: Direction, target: Box) => {
      expect(findNearestInDirection(box(0, 0, 10, 10), [target], direction)).toEqual(target)
    })

    it('should find offset candidate when requireOverlap is false and angle is within limit', () => {
      const from = boxWithId('from', 0, 0, 10, 10)
      const offset = boxWithId('offset', 20, 5, 10, 10)

      expect(findNearestInDirection(from, [offset], 'right', {requireOverlap: false})?.id).toBe(
        'offset',
      )
    })

    it('should return null for steep diagonal when requireOverlap is false', () => {
      const from = box(0, 0, 10, 10)
      const diagonal = box(20, 20, 10, 10)

      expect(findNearestInDirection(from, [diagonal], 'right', {requireOverlap: false})).toBeNull()
    })

    it('should pick the better candidate among multiple filtered targets', () => {
      const from = boxWithId('from', 0, 0, 10, 10)
      const targets = [
        boxWithId('left-of-from', -20, 0, 10, 10),
        boxWithId('near', 20, 0, 10, 10),
        boxWithId('far', 80, 0, 10, 10),
      ]

      expect(findNearestInDirection(from, targets, 'right')?.id).toBe('near')
    })
  })
})
