import {describe, expect, it} from 'vitest'
import {
  filterCandidates,
  horizontalOverlap,
  jumpFocus,
  moveFocus,
  scoreAngleCandidate,
  verticalOverlap,
} from '../focus-candidate'
import {createFocusRect as _createFocusRect, type Direction, type FocusRect, type Rect} from '../focus-store'

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
interface CreateFocusRectOptions {
  id?: string
  parent?: FocusRect
}

const createFocusRect = (
  left: number,
  top: number,
  right: number,
  bottom: number,
  options: CreateFocusRectOptions = {},
): FocusRect => {
  const {id = 'test', parent} = options
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
      const from = createFocusRect(0, 0, 10, 10, {id: 'from'})
      const to = [from, createFocusRect(20, 0, 30, 10, {id: 'to1'})]

      const result = filterCandidates(from, to, 'right')

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('to1')
    })

    describe('right direction', () => {
      it('should filter candidates to the right with vertical overlap', () => {
        const from = createFocusRect(0, 0, 10, 10)

        const to = [
          // right with overlap
          createFocusRect(20, 0, 30, 10, {id: 'right1'}),
          // right without overlap
          createFocusRect(20, 20, 30, 30, {id: 'right2'}),
          // left
          createFocusRect(-10, 0, 0, 10, {id: 'left'}),
          // overlapping (cx > from.cx and has overlap)
          createFocusRect(5, 0, 15, 10, {id: 'overlap'}),
        ]

        const result = filterCandidates(from, to, 'right')

        // right1 and overlap both qualify
        expect(result).toHaveLength(2)
        expect(result.map((r) => r.id)).toContain('right1')
        expect(result.map((r) => r.id)).toContain('overlap')
      })

      it('should not include candidates to the left', () => {
        const from = createFocusRect(10, 0, 20, 10)
        const to = [createFocusRect(0, 0, 5, 10, {id: 'left'})]

        const result = filterCandidates(from, to, 'right')

        expect(result).toHaveLength(0)
      })
    })

    describe('left direction', () => {
      it('should filter candidates to the left with vertical overlap', () => {
        const from = createFocusRect(20, 0, 30, 10)

        const to = [
          // left with overlap
          createFocusRect(0, 0, 10, 10, {id: 'left1'}),
          // left without overlap
          createFocusRect(0, 20, 10, 30, {id: 'left2'}),
          // right
          createFocusRect(40, 0, 50, 10, {id: 'right'}),
        ]

        const result = filterCandidates(from, to, 'left')

        expect(result).toHaveLength(1)
        expect(result[0]?.id).toBe('left1')
      })

      it('should not include candidates to the right', () => {
        const from = createFocusRect(0, 0, 10, 10)
        const to = [createFocusRect(20, 0, 30, 10, {id: 'right'})]

        const result = filterCandidates(from, to, 'left')

        expect(result).toHaveLength(0)
      })
    })

    describe('down direction', () => {
      it('should filter candidates below with horizontal overlap', () => {
        const from = createFocusRect(0, 0, 10, 10)

        const to = [
          // down with overlap
          createFocusRect(0, 20, 10, 30, {id: 'down1'}),
          // down without overlap
          createFocusRect(20, 20, 30, 30, {id: 'down2'}),
          // up
          createFocusRect(0, -10, 10, 0, {id: 'up'}),
        ]

        const result = filterCandidates(from, to, 'down')

        expect(result).toHaveLength(1)
        expect(result[0]?.id).toBe('down1')
      })

      it('should not include candidates above', () => {
        const from = createFocusRect(0, 20, 10, 30)
        const to = [createFocusRect(0, 0, 10, 10, {id: 'up'})]

        const result = filterCandidates(from, to, 'down')

        expect(result).toHaveLength(0)
      })
    })

    describe('up direction', () => {
      it('should filter candidates above with horizontal overlap', () => {
        const from = createFocusRect(0, 20, 10, 30)

        const to = [
          // up with overlap
          createFocusRect(0, 0, 10, 10, {id: 'up1'}),
          // up without overlap
          createFocusRect(20, 0, 30, 10, {id: 'up2'}),
          // down
          createFocusRect(0, 40, 10, 50, {id: 'down'}),
        ]

        const result = filterCandidates(from, to, 'up')

        expect(result).toHaveLength(1)
        expect(result[0]?.id).toBe('up1')
      })

      it('should not include candidates below', () => {
        const from = createFocusRect(0, 0, 10, 10)
        const to = [createFocusRect(0, 20, 10, 30, {id: 'down'})]

        const result = filterCandidates(from, to, 'up')

        expect(result).toHaveLength(0)
      })
    })
  })

  describe('scoreAngleCandidate', () => {
    it('should return EXCLUDED_SCORE when primary distance is 0 or negative for right direction', () => {
      const from = createFocusRect(0, 0, 10, 10)
      // same position
      const to = createFocusRect(0, 0, 10, 10)

      const score = scoreAngleCandidate(from, to, 'right', 0.5)

      expect(score).toBe(-10_000)
    })

    it('should return EXCLUDED_SCORE when angle ratio exceeds limit', () => {
      const from = createFocusRect(0, 0, 10, 10)
      // diagonal, angle ratio = 1
      const to = createFocusRect(20, 20, 30, 30)

      const score = scoreAngleCandidate(from, to, 'right', 0.5)

      expect(score).toBe(-10_000)
    })

    it('should return positive score for valid candidate in right direction', () => {
      const from = createFocusRect(0, 0, 10, 10)
      // directly to the right
      const to = createFocusRect(20, 0, 30, 10)

      const score = scoreAngleCandidate(from, to, 'right', 0.5)

      expect(score).toBeGreaterThan(-10_000)
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
      // perfectly aligned
      const aligned = createFocusRect(20, 0, 30, 10)
      // slightly offset
      const offset = createFocusRect(20, 5, 30, 15)

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

      expect(score).toBeGreaterThan(-10_000)
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
      // to the left, not right
      const to = [createFocusRect(-20, 0, -10, 10)]

      const result = moveFocus(from, to, 'right')

      expect(result).toBeNull()
    })

    it('should return the best candidate based on score', () => {
      const from = createFocusRect(0, 0, 10, 10)

      const to = [
        // far but aligned
        createFocusRect(100, 0, 110, 10, {id: 'far'}),
        // close and aligned
        createFocusRect(20, 0, 30, 10, {id: 'close'}),
        // medium distance, slightly offset
        createFocusRect(50, 5, 60, 15, {id: 'offset'}),
      ]

      const result = moveFocus(from, to, 'right')

      expect(result).not.toBeNull()
      // closest should win
      expect(result?.id).toBe('close')
    })

    it('should return the most aligned candidate when distances are similar', () => {
      const from = createFocusRect(0, 0, 10, 10)

      const to = [
        // offset vertically
        createFocusRect(20, 10, 30, 20, {id: 'offset'}),
        // perfectly aligned
        createFocusRect(20, 0, 30, 10, {id: 'aligned'}),
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
        createFocusRect(30, 0, 40, 10, {id: 'candidate1'}),
        // closest
        createFocusRect(20, 0, 30, 10, {id: 'candidate2'}),
        createFocusRect(40, 0, 50, 10, {id: 'candidate3'}),
      ]

      const result = moveFocus(from, to, 'right')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('candidate2')
    })

    it('should exclude candidates with angle ratio exceeding limit', () => {
      const from = createFocusRect(0, 0, 10, 10)

      const to = [
        // angle ratio = 1, exceeds 0.5 limit
        createFocusRect(20, 20, 30, 30, {id: 'diagonal'}),
        // angle ratio = 0, within limit
        createFocusRect(20, 0, 30, 10, {id: 'aligned'}),
      ]

      const result = moveFocus(from, to, 'right')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('aligned')
    })

    it('should move focus to rect that does not have children', () => {
      const from = createFocusRect(0, 0, 10, 10)
      const parent1 = createFocusRect(20, 0, 30, 10, {id: 'p1'})
      const child1 = createFocusRect(25, 0, 28, 10, {id: 'c1'})
      const child2 = createFocusRect(25, 5, 28, 15, {id: 'c2'})

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
      const from = createFocusRect(0, 0, 10, 10, {id: 'from'})
      const candidate = createFocusRect(20, 0, 30, 10, {id: 'candidate'})

      const result = jumpFocus(from, [candidate], 'right')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('candidate')
    })

    it('should search parent siblings when no direct candidate exists', () => {
      const root = createFocusRect(-100, 0, -90, 10, {id: 'root'})
      const groupA = createFocusRect(0, 0, 10, 10, {id: 'groupA', parent: root})
      const groupB = createFocusRect(80, 0, 90, 10, {id: 'groupB', parent: root})
      const from = createFocusRect(0, 0, 10, 10, {id: 'from', parent: groupA})

      createFocusRect(100, 0, 110, 10, {id: 'target', parent: groupB})

      const result = jumpFocus(from, [], 'right')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('target')
    })

    it('should return null when there is no parent to inspect', () => {
      const from = createFocusRect(0, 0, 10, 10, {id: 'from'})

      expect(jumpFocus(from, [], 'right')).toBeNull()
    })
  })
})
