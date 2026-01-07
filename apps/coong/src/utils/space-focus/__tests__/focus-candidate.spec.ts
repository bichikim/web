import {describe, expect, it} from 'vitest'
import {
  verticalOverlap,
  horizontalOverlap,
  filterCandidates,
  scoreAngleCandidate,
  moveFocus,
  jumpFocus,
} from '../focus-candidate'
import {type FocusRect, type Direction, createFocusRect as _createFocusRect, type Rect} from '../focus-store'

const createRect = (left: number, top: number, right: number, bottom: number): Rect => {
  return {
    bottom,
    cx: (left + right) / 2,
    cy: (top + bottom) / 2,
    left,
    right,
    top,
  }
}

/**
 * Helper function to create a FocusReact object
 */
const createFocusRect = (
  left: number,
  top: number,
  right: number,
  bottom: number,
  id: string = 'test',
  parent?: FocusRect,
): FocusRect => {
  const rect: Rect = createRect(left, top, right, bottom)

  const focusReact = _createFocusRect(id, parent ?? null, () => rect)

  focusReact.rect = rect
  focusReact.parent = parent ?? null

  if (parent) {
    parent.children.add(focusReact)
  }

  return focusReact
}

describe('focus-candidate', () => {
  describe('verticalOverlap', () => {
    it('should return negative value when rectangles do not overlap vertically', () => {
      const from = createRect(0, 0, 10, 10)
      const to = createRect(0, 20, 10, 30)

      expect(verticalOverlap(from, to)).toBe(-10)
    })

    it('should return correct overlap when rectangles overlap vertically', () => {
      const from = createRect(0, 0, 10, 10)
      const to = createRect(0, 5, 10, 15)

      expect(verticalOverlap(from, to)).toBe(5)
    })

    it('should return correct overlap when one rectangle is completely inside another', () => {
      const from = createRect(0, 0, 10, 10)
      const to = createRect(0, 2, 10, 8)

      expect(verticalOverlap(from, to)).toBe(6)
    })

    it('should return correct overlap when rectangles are adjacent', () => {
      const from = createRect(0, 0, 10, 10)
      const to = createRect(0, 10, 10, 20)

      expect(verticalOverlap(from, to)).toBe(0)
    })
  })

  describe('horizontalOverlap', () => {
    it('should return negative value when rectangles do not overlap horizontally', () => {
      const from = createRect(0, 0, 10, 10)
      const to = createRect(20, 0, 30, 10)

      expect(horizontalOverlap(from, to)).toBeLessThanOrEqual(0)
    })

    it('should return correct overlap when rectangles overlap horizontally', () => {
      const from = createRect(0, 0, 10, 10)
      const to = createRect(5, 0, 15, 10)

      expect(horizontalOverlap(from, to)).toBe(5)
    })

    it('should return correct overlap when one rectangle is completely inside another', () => {
      const from = createRect(0, 0, 10, 10)
      const to = createRect(2, 0, 8, 10)

      expect(horizontalOverlap(from, to)).toBe(6)
    })

    it('should return correct overlap when rectangles are adjacent', () => {
      const from = createRect(0, 0, 10, 10)
      const to = createRect(10, 0, 20, 10)

      expect(horizontalOverlap(from, to)).toBe(0)
    })
  })

  describe('filterCandidates', () => {
    it('should filter out the from element itself', () => {
      const from = createFocusRect(0, 0, 10, 10, 'from')
      const to = [from, createFocusRect(20, 0, 30, 10, 'to1')]

      const result = filterCandidates(from, to, 'right')

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('to1')
    })

    describe('right direction', () => {
      it('should filter candidates to the right with vertical overlap', () => {
        const from = createFocusRect(0, 0, 10, 10)

        const to = [
          createFocusRect(20, 0, 30, 10, 'right1'), // right with overlap
          createFocusRect(20, 20, 30, 30, 'right2'), // right without overlap
          createFocusRect(-10, 0, 0, 10, 'left'), // left
          createFocusRect(5, 0, 15, 10, 'overlap'), // overlapping (cx > from.cx and has overlap)
        ]

        const result = filterCandidates(from, to, 'right')

        expect(result).toHaveLength(2) // right1 and overlap both qualify
        expect(result.map((r) => r.id)).toContain('right1')
        expect(result.map((r) => r.id)).toContain('overlap')
      })

      it('should not include candidates to the left', () => {
        const from = createFocusRect(10, 0, 20, 10)
        const to = [createFocusRect(0, 0, 5, 10, 'left')]

        const result = filterCandidates(from, to, 'right')

        expect(result).toHaveLength(0)
      })
    })

    describe('left direction', () => {
      it('should filter candidates to the left with vertical overlap', () => {
        const from = createFocusRect(20, 0, 30, 10)

        const to = [
          createFocusRect(0, 0, 10, 10, 'left1'), // left with overlap
          createFocusRect(0, 20, 10, 30, 'left2'), // left without overlap
          createFocusRect(40, 0, 50, 10, 'right'), // right
        ]

        const result = filterCandidates(from, to, 'left')

        expect(result).toHaveLength(1)
        expect(result[0]?.id).toBe('left1')
      })

      it('should not include candidates to the right', () => {
        const from = createFocusRect(0, 0, 10, 10)
        const to = [createFocusRect(20, 0, 30, 10, 'right')]

        const result = filterCandidates(from, to, 'left')

        expect(result).toHaveLength(0)
      })
    })

    describe('down direction', () => {
      it('should filter candidates below with horizontal overlap', () => {
        const from = createFocusRect(0, 0, 10, 10)

        const to = [
          createFocusRect(0, 20, 10, 30, 'down1'), // down with overlap
          createFocusRect(20, 20, 30, 30, 'down2'), // down without overlap
          createFocusRect(0, -10, 10, 0, 'up'), // up
        ]

        const result = filterCandidates(from, to, 'down')

        expect(result).toHaveLength(1)
        expect(result[0]?.id).toBe('down1')
      })

      it('should not include candidates above', () => {
        const from = createFocusRect(0, 20, 10, 30)
        const to = [createFocusRect(0, 0, 10, 10, 'up')]

        const result = filterCandidates(from, to, 'down')

        expect(result).toHaveLength(0)
      })
    })

    describe('up direction', () => {
      it('should filter candidates above with horizontal overlap', () => {
        const from = createFocusRect(0, 20, 10, 30)

        const to = [
          createFocusRect(0, 0, 10, 10, 'up1'), // up with overlap
          createFocusRect(20, 0, 30, 10, 'up2'), // up without overlap
          createFocusRect(0, 40, 10, 50, 'down'), // down
        ]

        const result = filterCandidates(from, to, 'up')

        expect(result).toHaveLength(1)
        expect(result[0]?.id).toBe('up1')
      })

      it('should not include candidates below', () => {
        const from = createFocusRect(0, 0, 10, 10)
        const to = [createFocusRect(0, 20, 10, 30, 'down')]

        const result = filterCandidates(from, to, 'up')

        expect(result).toHaveLength(0)
      })
    })
  })

  describe('scoreAngleCandidate', () => {
    it('should return EXCLUDED_SCORE when primary distance is 0 or negative for right direction', () => {
      const from = createFocusRect(0, 0, 10, 10)
      const to = createFocusRect(0, 0, 10, 10) // same position

      const score = scoreAngleCandidate(from, to, 'right', 0.5)

      expect(score).toBe(-10000)
    })

    it('should return EXCLUDED_SCORE when angle ratio exceeds limit', () => {
      const from = createFocusRect(0, 0, 10, 10)
      const to = createFocusRect(20, 20, 30, 30) // diagonal, angle ratio = 1

      const score = scoreAngleCandidate(from, to, 'right', 0.5)

      expect(score).toBe(-10000)
    })

    it('should return positive score for valid candidate in right direction', () => {
      const from = createFocusRect(0, 0, 10, 10)
      const to = createFocusRect(20, 0, 30, 10) // directly to the right

      const score = scoreAngleCandidate(from, to, 'right', 0.5)

      expect(score).toBeGreaterThan(-10000)
    })

    it('should return higher score for closer candidate', () => {
      const from = createFocusRect(0, 0, 10, 10)
      const close = createFocusRect(20, 0, 30, 10)
      const far = createFocusRect(100, 0, 110, 10)

      const closeScore = scoreAngleCandidate(from, close, 'right', 0.5)
      const farScore = scoreAngleCandidate(from, far, 'right', 0.5)

      expect(closeScore).toBeGreaterThan(farScore)
    })

    it('should return higher score for more aligned candidate', () => {
      const from = createFocusRect(0, 0, 10, 10)
      const aligned = createFocusRect(20, 0, 30, 10) // perfectly aligned
      const offset = createFocusRect(20, 5, 30, 15) // slightly offset

      const alignedScore = scoreAngleCandidate(from, aligned, 'right', 0.5)
      const offsetScore = scoreAngleCandidate(from, offset, 'right', 0.5)

      expect(alignedScore).toBeGreaterThan(offsetScore)
    })

    it.each([
      ['right', createFocusRect(20, 0, 30, 10)],
      ['left', createFocusRect(-20, 0, -10, 10)],
      ['down', createFocusRect(0, 20, 10, 30)],
      ['up', createFocusRect(0, -20, 10, -10)],
    ] as const)('should return valid score for %s direction', (direction: Direction, to: FocusRect) => {
      const from = createFocusRect(0, 0, 10, 10)

      const score = scoreAngleCandidate(from, to, direction, 0.5)

      expect(score).toBeGreaterThan(-10000)
    })
  })

  describe('moveFocus', () => {
    it('should return null when no candidates are found', () => {
      const from = createFocusRect(0, 0, 10, 10)
      const to: FocusRect[] = []

      const result = moveFocus(from, to, 'right')

      expect(result).toBeNull()
    })

    it('should return null when all candidates are filtered out', () => {
      const from = createFocusRect(0, 0, 10, 10)
      const to = [createFocusRect(-20, 0, -10, 10)] // to the left, not right

      const result = moveFocus(from, to, 'right')

      expect(result).toBeNull()
    })

    it('should return the best candidate based on score', () => {
      const from = createFocusRect(0, 0, 10, 10)

      const to = [
        createFocusRect(100, 0, 110, 10, 'far'), // far but aligned
        createFocusRect(20, 0, 30, 10, 'close'), // close and aligned
        createFocusRect(50, 5, 60, 15, 'offset'), // medium distance, slightly offset
      ]

      const result = moveFocus(from, to, 'right')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('close') // closest should win
    })

    it('should return the most aligned candidate when distances are similar', () => {
      const from = createFocusRect(0, 0, 10, 10)

      const to = [
        createFocusRect(20, 10, 30, 20, 'offset'), // offset vertically
        createFocusRect(20, 0, 30, 10, 'aligned'), // perfectly aligned
      ]

      const result = moveFocus(from, to, 'right')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('aligned')
    })

    it.each([
      ['right', createFocusRect(20, 0, 30, 10)],
      ['left', createFocusRect(-20, 0, -10, 10)],
      ['down', createFocusRect(0, 20, 10, 30)],
      ['up', createFocusRect(0, -20, 10, -10)],
    ] as const)('should return candidate for %s direction', (direction: Direction, candidate: FocusRect) => {
      const from = createFocusRect(0, 0, 10, 10)
      const to = [candidate]

      const result = moveFocus(from, to, direction)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(candidate.id)
    })

    it('should handle multiple candidates and select the best one', () => {
      const from = createFocusRect(0, 0, 10, 10)

      const to = [
        createFocusRect(30, 0, 40, 10, 'candidate1'),
        createFocusRect(20, 0, 30, 10, 'candidate2'), // closest
        createFocusRect(40, 0, 50, 10, 'candidate3'),
      ]

      const result = moveFocus(from, to, 'right')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('candidate2')
    })

    it('should exclude candidates with angle ratio exceeding limit', () => {
      const from = createFocusRect(0, 0, 10, 10)

      const to = [
        createFocusRect(20, 20, 30, 30, 'diagonal'), // angle ratio = 1, exceeds 0.5 limit
        createFocusRect(20, 0, 30, 10, 'aligned'), // angle ratio = 0, within limit
      ]

      const result = moveFocus(from, to, 'right')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('aligned')
    })

    it('should move focus to rect that does not have children', () => {
      const from = createFocusRect(0, 0, 10, 10)
      const parent1 = createFocusRect(20, 0, 30, 10, 'p1')
      const child1 = createFocusRect(25, 0, 28, 10, 'c1')
      const child2 = createFocusRect(25, 5, 28, 15, 'c2')

      parent1.children.add(child1)
      parent1.children.add(child2)

      const to = [parent1, child1, child2]

      const result = moveFocus(from, to, 'right')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('c1')
    })
  })

  describe('jumpFocus', () => {
    it('should return candidate found in the initial scope', () => {
      const from = createFocusRect(0, 0, 10, 10, 'from')
      const candidate = createFocusRect(20, 0, 30, 10, 'candidate')

      const result = jumpFocus(from, [candidate], 'right')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('candidate')
    })

    it('should search parent siblings when no direct candidate exists', () => {
      const root = createFocusRect(-100, 0, -90, 10, 'root')
      const groupA = createFocusRect(0, 0, 10, 10, 'groupA', root)
      const groupB = createFocusRect(80, 0, 90, 10, 'groupB', root)
      const from = createFocusRect(0, 0, 10, 10, 'from', groupA)

      createFocusRect(100, 0, 110, 10, 'target', groupB)

      const result = jumpFocus(from, [], 'right')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('target')
    })

    it('should return null when there is no parent to inspect', () => {
      const from = createFocusRect(0, 0, 10, 10, 'from')

      expect(jumpFocus(from, [], 'right')).toBeNull()
    })
  })
})

