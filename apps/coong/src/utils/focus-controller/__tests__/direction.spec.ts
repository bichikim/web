import {describe, expect, it} from 'vitest'
import {type DirectionName, directionNameMap, getDirection} from '../direction'

describe('direction', () => {
  describe('directionNameMap', () => {
    it('should have correct mapping for "down" direction', () => {
      expect(directionNameMap.down).toEqual({x: 0, y: 1})
    })

    it('should have correct mapping for "left" direction', () => {
      expect(directionNameMap.left).toEqual({x: -1, y: 0})
    })

    it('should have correct mapping for "right" direction', () => {
      expect(directionNameMap.right).toEqual({x: 1, y: 0})
    })

    it('should have correct mapping for "up" direction', () => {
      expect(directionNameMap.up).toEqual({x: 0, y: -1})
    })
  })

  describe('getDirection', () => {
    it('should return correct direction for "down"', () => {
      const result = getDirection('down')

      expect(result).toEqual({x: 0, y: 1})
    })

    it('should return correct direction for "left"', () => {
      const result = getDirection('left')

      expect(result).toEqual({x: -1, y: 0})
    })

    it('should return correct direction for "right"', () => {
      const result = getDirection('right')

      expect(result).toEqual({x: 1, y: 0})
    })

    it('should return correct direction for "up"', () => {
      const result = getDirection('up')

      expect(result).toEqual({x: 0, y: -1})
    })

    it('should return default direction for invalid direction name', () => {
      // TypeScript에서는 타입 체크가 되지만, 런타임에서는 타입 캐스팅으로 우회 가능
      const result = getDirection('invalid' as DirectionName)

      expect(result).toEqual({x: 0, y: 0})
    })
  })
})
