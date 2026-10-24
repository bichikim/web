import {describe, expect, it} from 'vitest'
import {
  type DeepPosition,
  getDeepPosition,
  getDeepPositionKey,
  getNextPosition,
  getNextPositionByDirectionName,
  getParentPosition,
  type Position,
} from '../deep-position'

describe('deep-position', () => {
  describe('getNextPosition', () => {
    it('should return next position by adding direction to current position', () => {
      const position: Position = {x: 0, y: 0}
      const direction: Position = {x: 1, y: 1}

      const result = getNextPosition(position, direction)

      expect(result).toEqual({x: 1, y: 1})
    })

    it('should handle negative direction values', () => {
      const position: Position = {x: 5, y: 5}
      const direction: Position = {x: -2, y: -3}

      const result = getNextPosition(position, direction)

      expect(result).toEqual({x: 3, y: 2})
    })

    it('should handle zero direction values', () => {
      const position: Position = {x: 10, y: 20}
      const direction: Position = {x: 0, y: 0}

      const result = getNextPosition(position, direction)

      expect(result).toEqual({x: 10, y: 20})
    })
  })

  describe('getNextPositionByDirectionName', () => {
    it('should return next position for "right" direction', () => {
      const position: Position = {x: 0, y: 0}

      const result = getNextPositionByDirectionName(position, 'right')

      expect(result).toEqual({x: 1, y: 0})
    })

    it('should return next position for "left" direction', () => {
      const position: Position = {x: 5, y: 5}

      const result = getNextPositionByDirectionName(position, 'left')

      expect(result).toEqual({x: 4, y: 5})
    })

    it('should return next position for "down" direction', () => {
      const position: Position = {x: 0, y: 0}

      const result = getNextPositionByDirectionName(position, 'down')

      expect(result).toEqual({x: 0, y: 1})
    })

    it('should return next position for "up" direction', () => {
      const position: Position = {x: 10, y: 10}

      const result = getNextPositionByDirectionName(position, 'up')

      expect(result).toEqual({x: 10, y: 9})
    })
  })

  describe('getDeepPositionKey', () => {
    it('should generate key with default separator and connector', () => {
      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 2, y: 2},
      ]

      const result = getDeepPositionKey(deepPosition)

      expect(result).toBe('0,0|1,1|2,2::?')
    })

    it('should generate key with custom separator and connector', () => {
      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      const result = getDeepPositionKey(deepPosition, {connector: '->', separator: '_'})

      expect(result).toBe('0_0->1_1::?')
    })

    it('should handle single position', () => {
      const deepPosition: DeepPosition = [{x: 5, y: 10}]

      const result = getDeepPositionKey(deepPosition)

      expect(result).toBe('5,10::?')
    })

    it('should handle empty deep position', () => {
      const deepPosition: DeepPosition = []

      const result = getDeepPositionKey(deepPosition)

      expect(result).toBe('::?')
    })

    it('should handle negative position values', () => {
      const deepPosition: DeepPosition = [
        {x: -1, y: -2},
        {x: -3, y: -4},
      ]

      const result = getDeepPositionKey(deepPosition)

      expect(result).toBe('-1,-2|-3,-4::?')
    })

    it('should handle large position values', () => {
      const deepPosition: DeepPosition = [
        {x: 100, y: 200},
        {x: 300, y: 400},
      ]

      const result = getDeepPositionKey(deepPosition)

      expect(result).toBe('100,200|300,400::?')
    })

    it('should generate key with id', () => {
      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      const result = getDeepPositionKey(deepPosition, {id: 'test'})

      expect(result).toBe('0,0|1,1::test')
    })
  })

  describe('getDeepPosition', () => {
    it('should parse key with default separator and connector', () => {
      const key = '0,0|1,1|2,2'

      const result = getDeepPosition(key)

      expect(result).toEqual([
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 2, y: 2},
      ])
    })

    it('should parse key with custom separator and connector', () => {
      const key = '0_0->1_1'

      const result = getDeepPosition(key, {connector: '->', separator: '_'})

      expect(result).toEqual([
        {x: 0, y: 0},
        {x: 1, y: 1},
      ])
    })

    it('should handle empty key', () => {
      const result = getDeepPosition('')

      expect(result).toEqual([])
    })

    it('should handle single position', () => {
      const key = '5,10'

      const result = getDeepPosition(key)

      expect(result).toEqual([{x: 5, y: 10}])
    })

    it('should handle negative position values', () => {
      const key = '-1,-2|-3,-4'

      const result = getDeepPosition(key)

      expect(result).toEqual([
        {x: -1, y: -2},
        {x: -3, y: -4},
      ])
    })

    it('should filter out invalid positions with missing values', () => {
      const key = '0,0|1|2,2'

      const result = getDeepPosition(key)

      expect(result).toEqual(null)
    })

    it('should filter out invalid positions with NaN values', () => {
      const key = '0,0|abc,123|2,2'

      const result = getDeepPosition(key)

      expect(result).toEqual(null)
    })

    it('should filter out invalid positions with non-numeric strings', () => {
      const key = '0,0|xyz,abc|2,2'

      const result = getDeepPosition(key)

      expect(result).toEqual(null)
    })

    it('should return null when separator is "-"', () => {
      const key = '0-0|1-1'

      const result = getDeepPosition(key, {separator: '-'})

      expect(result).toEqual(null)
    })
  })

  describe('getParentPosition', () => {
    it('should return parent position', () => {
      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 2, y: 2},
      ]

      const result = getParentPosition(deepPosition, 1)

      expect(result).toEqual([{x: 0, y: 0}])
    })

    it('should return empty array if deep index is 0', () => {
      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 2, y: 2},
      ]

      const result = getParentPosition(deepPosition, 0)

      expect(result).toEqual([])
    })

    it('should return empty array if deep index is negative', () => {
      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 2, y: 2},
      ]

      const result = getParentPosition(deepPosition, -1)

      expect(result).toEqual([])
    })

    it('should return full array if deep index is greater than deep position length', () => {
      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 2, y: 2},
      ]

      const result = getParentPosition(deepPosition, 3)

      expect(result).toEqual([
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 2, y: 2},
      ])
    })
  })
})
