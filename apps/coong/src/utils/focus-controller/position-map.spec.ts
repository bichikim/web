import {describe, expect, it, vi, beforeEach} from 'vitest'
import {
  createPositionMap,
  DEFAULT_FILL_OPTIONS,
  DEFAULT_JUMP_OPTIONS,
  DEFAULT_KEY_OPTIONS,
  DEFAULT_MAX_SEARCH_LENGTH,
  DEFAULT_MOVE_OPTIONS,
  fillPreviousDeepPosition,
  getDeepPositionInfo,
  getDeepPositionInfoWithKey,
  getNextDeepPosition,
  getParentInfo,
  getPreviousPosition,
  hasDeepPosition,
  hasDeepPositionWithKey,
  jumpDeepPosition,
  moveDeepPosition,
  registerDeepPosition,
  registerDeepPositionWithKey,
  restoreDeepPosition,
  unregisterDeepPosition,
  unregisterDeepPositionWithKey,
  updateDeepPositionPayloadWithKey,
  getRecursiveDeepPosition,
  registerDeepPositionRecursively,
  unregisterDeepPositionRecursively,
  savePreviousDeepPosition,
  findNextDeepPosition,
} from './position-map'
import {getDirection} from './direction'
import type {Direction} from './direction'
import type {DeepPosition} from './deep-position'

describe('position-map', () => {
  describe('createPositionMap', () => {
    it('should create a new position map with root deep position', () => {
      const positionMap = createPositionMap()

      expect(positionMap).toBeInstanceOf(Map)
    })
  })

  describe('hasDeepPosition', () => {
    it('should return true if deep position exists', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 1, y: 1}]

      registerDeepPosition(positionMap, deepPosition)
      expect(hasDeepPosition(positionMap, deepPosition)).toBe(true)
    })

    it('should return false if deep position does not exist', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 999, y: 999}]

      registerDeepPosition(positionMap, [{x: 1, y: 1}])
      expect(hasDeepPosition(positionMap, deepPosition)).toBe(false)
    })

    it('should work with custom options', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 1, y: 1}]
      const customOptions = {connector: '->', separator: '_'}

      registerDeepPosition(positionMap, deepPosition, {}, customOptions)
      expect(hasDeepPosition(positionMap, deepPosition, customOptions)).toBe(true)
    })

    it('should return true if root deep position exists', () => {
      const positionMap = createPositionMap()

      registerDeepPosition(positionMap, [])
      expect(hasDeepPosition(positionMap, [])).toBe(true)
    })
  })

  describe('getRecursiveDeepPosition', () => {
    it('should return recursive deep position list', () => {
      const deepPosition: DeepPosition = [
        {x: 1, y: 1},
        {x: 2, y: 2},
        {x: 3, y: 3},
      ]
      const result = getRecursiveDeepPosition(deepPosition)

      expect(result).toEqual([
        deepPosition,
        [
          {x: 1, y: 1},
          {x: 2, y: 2},
        ],
        [{x: 1, y: 1}],
        [],
      ])
    })

    it('should return empty list if deep position is empty', () => {
      const deepPosition: DeepPosition = []
      const result = getRecursiveDeepPosition(deepPosition)

      expect(result).toEqual([])
    })
  })

  describe('hasDeepPositionWithKey', () => {
    it('should return true if key exists', () => {
      const positionMap = createPositionMap()
      const key = '1,1'

      registerDeepPositionWithKey(positionMap, key)
      expect(hasDeepPositionWithKey(positionMap, key)).toBe(true)
    })

    it('should return false if key does not exist', () => {
      const positionMap = createPositionMap()

      registerDeepPositionWithKey(positionMap, '1,1')
      expect(hasDeepPositionWithKey(positionMap, '999,999')).toBe(false)
    })

    it('should return false if inactive is true', () => {
      const positionMap = createPositionMap()
      const key = '1,1'

      registerDeepPositionWithKey(positionMap, key, {inactive: true})
      expect(hasDeepPositionWithKey(positionMap, key)).toBe(false)
    })
  })

  describe('registerDeepPositionRecursively', () => {
    it('should register a new deep position recursively', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 1, y: 1},
        {x: 2, y: 2},
        {x: 3, y: 3},
      ]

      registerDeepPositionRecursively(positionMap, deepPosition)
      expect(hasDeepPosition(positionMap, deepPosition)).toBe(true)

      expect(
        hasDeepPosition(positionMap, [
          {x: 1, y: 1},
          {x: 2, y: 2},
        ]),
      ).toBe(true)
      expect(hasDeepPosition(positionMap, [{x: 1, y: 1}])).toBe(true)
      expect(hasDeepPosition(positionMap, [])).toBe(true)
    })

    it('should not set payload on parent deep position', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 1, y: 1},
        {x: 2, y: 2},
        {x: 3, y: 3},
      ]

      registerDeepPositionRecursively(positionMap, deepPosition, {previousChildPosition: {x: 4, y: 4}})
      expect(getDeepPositionInfo(positionMap, deepPosition)?.previousChildPosition).toEqual({x: 4, y: 4})

      expect(
        getDeepPositionInfo(positionMap, [
          {x: 1, y: 1},
          {x: 2, y: 2},
        ])?.previousChildPosition,
      ).toBeUndefined()
      expect(getDeepPositionInfo(positionMap, [{x: 1, y: 1}])?.previousChildPosition).toBeUndefined()
      expect(getDeepPositionInfo(positionMap, [])?.previousChildPosition).toBeUndefined()
    })

    it('should change count of parent deep position', () => {
      const positionMap = createPositionMap()

      const deepPositionA: DeepPosition = [
        {x: 1, y: 1},
        {x: 2, y: 2},
      ]

      const deepPositionB: DeepPosition = [
        {x: 1, y: 1},
        {x: 2, y: 2},
        {x: 3, y: 3},
      ]

      const deepPositionC: DeepPosition = [
        {x: 1, y: 1},
        {x: 2, y: 2},
        {x: 4, y: 4},
      ]

      const deepPositionD: DeepPosition = [
        {x: 1, y: 1},
        {x: 2, y: 2},
        {x: 3, y: 3},
        {x: 4, y: 4},
      ]

      registerDeepPositionRecursively(positionMap, deepPositionA)
      registerDeepPositionRecursively(positionMap, deepPositionB)
      registerDeepPositionRecursively(positionMap, deepPositionC)
      registerDeepPositionRecursively(positionMap, deepPositionD)
      expect(getDeepPositionInfo(positionMap, deepPositionA)?.count).toBe(4)
      expect(getDeepPositionInfo(positionMap, deepPositionB)?.count).toBe(2)
      expect(getDeepPositionInfo(positionMap, deepPositionC)?.count).toBe(1)
      expect(getDeepPositionInfo(positionMap, [{x: 1, y: 1}])?.count).toBe(4)
      expect(getDeepPositionInfo(positionMap, deepPositionD)?.count).toBe(1)
      expect(getDeepPositionInfo(positionMap, [])?.count).toBe(4)
    })
  })

  describe('registerDeepPosition', () => {
    it('should register a new deep position', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 1, y: 1}]

      registerDeepPosition(positionMap, deepPosition)
      expect(hasDeepPosition(positionMap, deepPosition)).toBe(true)
    })

    it('should increment count when registering same position multiple times', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 1, y: 1}]

      registerDeepPosition(positionMap, deepPosition)
      registerDeepPosition(positionMap, deepPosition)
      registerDeepPosition(positionMap, deepPosition)

      const info = getDeepPositionInfo(positionMap, deepPosition)

      expect(info?.count).toBe(3)
    })

    it('should store payload when registering', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 1, y: 1}]
      const payload = {previousChildPosition: {x: 0, y: 0}}

      registerDeepPosition(positionMap, deepPosition, payload)

      const info = getDeepPositionInfo(positionMap, deepPosition)

      expect(info?.previousChildPosition).toEqual({x: 0, y: 0})
    })

    it('should merge payload when registering multiple times', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 1, y: 1}]

      registerDeepPosition(positionMap, deepPosition, {previousChildPosition: {x: 0, y: 0}})
      registerDeepPosition(positionMap, deepPosition, {previousChildPosition: {x: 1, y: 1}})

      const info = getDeepPositionInfo(positionMap, deepPosition)

      expect(info?.previousChildPosition).toEqual({x: 1, y: 1})
      expect(info?.count).toBe(2)
    })
  })

  describe('registerDeepPositionWithKey', () => {
    it('should register a new deep position with key', () => {
      const positionMap = createPositionMap()
      const key = '1,1'

      registerDeepPositionWithKey(positionMap, key)
      expect(hasDeepPositionWithKey(positionMap, key)).toBe(true)
    })

    it('should increment count when registering same key multiple times', () => {
      const positionMap = createPositionMap()
      const key = '1,1'

      registerDeepPositionWithKey(positionMap, key)
      registerDeepPositionWithKey(positionMap, key)

      const info = getDeepPositionInfoWithKey(positionMap, key)

      expect(info?.count).toBe(2)
    })

    it('should store payload when registering', () => {
      const positionMap = createPositionMap()
      const key = '1,1'
      const payload = {previousChildPosition: {x: 0, y: 0}}

      registerDeepPositionWithKey(positionMap, key, payload)

      const info = getDeepPositionInfoWithKey(positionMap, key)

      expect(info?.previousChildPosition).toEqual({x: 0, y: 0})
    })

    it('should not increment count when noIncrementCount is true', () => {
      const positionMap = createPositionMap()
      const key = '1,1'

      registerDeepPositionWithKey(positionMap, key, {}, true)
      expect(hasDeepPositionWithKey(positionMap, key)).toBe(false)
      expect(getDeepPositionInfoWithKey(positionMap, key)?.count).toBe(0)
    })
  })

  describe('unregisterDeepPosition', () => {
    it('should delete position when count is 1', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 1, y: 1}]

      registerDeepPosition(positionMap, deepPosition)
      unregisterDeepPosition(positionMap, deepPosition)
      expect(hasDeepPosition(positionMap, deepPosition)).toBe(false)
    })

    it('should decrement count when count is greater than 1', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 1, y: 1}]

      registerDeepPosition(positionMap, deepPosition)
      registerDeepPosition(positionMap, deepPosition)
      unregisterDeepPosition(positionMap, deepPosition)

      const info = getDeepPositionInfo(positionMap, deepPosition)

      expect(info?.count).toBe(1)
    })

    it('should work with custom options', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 1, y: 1}]
      const customOptions = {connector: '->', separator: '_'}

      registerDeepPosition(positionMap, deepPosition, {}, customOptions)
      unregisterDeepPosition(positionMap, deepPosition, customOptions)
      expect(hasDeepPosition(positionMap, deepPosition, customOptions)).toBe(false)
    })
  })

  describe('unregisterDeepPositionWithKey', () => {
    it('should delete position when count is 1', () => {
      const positionMap = createPositionMap()
      const key = '1,1'

      registerDeepPositionWithKey(positionMap, key)
      unregisterDeepPositionWithKey(positionMap, key)
      expect(hasDeepPositionWithKey(positionMap, key)).toBe(false)
    })

    it('should decrement count when count is greater than 1', () => {
      const positionMap = createPositionMap()
      const key = '1,1'

      registerDeepPositionWithKey(positionMap, key)
      registerDeepPositionWithKey(positionMap, key)
      unregisterDeepPositionWithKey(positionMap, key)

      const info = getDeepPositionInfoWithKey(positionMap, key)

      expect(info?.count).toBe(1)
    })

    it('should preserve payload when decrementing count', () => {
      const positionMap = createPositionMap()
      const key = '1,1'
      const payload = {previousChildPosition: {x: 0, y: 0}}

      registerDeepPositionWithKey(positionMap, key, payload)
      registerDeepPositionWithKey(positionMap, key, payload)
      unregisterDeepPositionWithKey(positionMap, key)

      const info = getDeepPositionInfoWithKey(positionMap, key)

      expect(info?.previousChildPosition).toEqual({x: 0, y: 0})
      expect(info?.count).toBe(1)
    })

    it('should decrement count until it reaches 0', () => {
      const positionMap = createPositionMap()
      const key = '1,1'

      registerDeepPositionWithKey(positionMap, key)
      registerDeepPositionWithKey(positionMap, key)
      unregisterDeepPositionWithKey(positionMap, key)
      unregisterDeepPositionWithKey(positionMap, key)

      const info = getDeepPositionInfoWithKey(positionMap, key)

      expect(info?.count).toBe(0)
    })

    it('should delete position info when count is 0 and cleanUpWhenZero is true', () => {
      const positionMap = createPositionMap()
      const key = '1,1'

      registerDeepPositionWithKey(positionMap, key, {previousChildPosition: {x: 0, y: 0}})
      registerDeepPositionWithKey(positionMap, key)
      unregisterDeepPositionWithKey(positionMap, key, {cleanUpWhenZero: true})
      expect(hasDeepPositionWithKey(positionMap, key)).toBe(true)
      expect(getDeepPositionInfoWithKey(positionMap, key)?.previousChildPosition).toEqual({x: 0, y: 0})
      unregisterDeepPositionWithKey(positionMap, key, {cleanUpWhenZero: true})
      expect(hasDeepPositionWithKey(positionMap, key)).toBe(false)
      expect(getDeepPositionInfoWithKey(positionMap, key)?.previousChildPosition).toBeUndefined()
    })

    it('should delete position info with cleanUpInfo is true', () => {
      const positionMap = createPositionMap()
      const key = '1,1'

      registerDeepPositionWithKey(positionMap, key, {previousChildPosition: {x: 0, y: 0}})
      registerDeepPositionWithKey(positionMap, key)
      unregisterDeepPositionWithKey(positionMap, key, {cleanUpInfo: true})
      expect(hasDeepPositionWithKey(positionMap, key)).toBe(true)
      expect(getDeepPositionInfoWithKey(positionMap, key)?.previousChildPosition).toBeUndefined()
      unregisterDeepPositionWithKey(positionMap, key)
      expect(hasDeepPositionWithKey(positionMap, key)).toBe(false)
      expect(getDeepPositionInfoWithKey(positionMap, key)?.previousChildPosition).toBeUndefined()
    })
  })

  describe('unregisterDeepPositionRecursively', () => {
    it('should unregister a deep position recursively', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 1, y: 1},
        {x: 2, y: 2},
      ]

      registerDeepPositionRecursively(positionMap, deepPosition)
      unregisterDeepPositionRecursively(positionMap, deepPosition)
    })

    it('should unregister a deep position with cleanUpWhenZero options', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 1, y: 1},
        {x: 2, y: 2},
      ]

      registerDeepPositionRecursively(positionMap, deepPosition, {previousChildPosition: {x: 0, y: 0}})
      registerDeepPositionRecursively(positionMap, deepPosition)
      unregisterDeepPositionRecursively(positionMap, deepPosition, {cleanUpWhenZero: true})
      expect(hasDeepPosition(positionMap, deepPosition)).toBe(true)
      expect(hasDeepPosition(positionMap, [{x: 1, y: 1}])).toBe(true)
      expect(getDeepPositionInfo(positionMap, deepPosition)?.previousChildPosition).toEqual({x: 0, y: 0})
      expect(getDeepPositionInfo(positionMap, [{x: 1, y: 1}])?.previousChildPosition).toBeUndefined()
      unregisterDeepPositionRecursively(positionMap, deepPosition, {cleanUpWhenZero: true})
      expect(getDeepPositionInfo(positionMap, deepPosition)?.previousChildPosition).toBeUndefined()
      expect(getDeepPositionInfo(positionMap, [{x: 1, y: 1}])?.previousChildPosition).toBeUndefined()
    })

    it('should unregister a deep position with cleanUpInfo options', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 1, y: 1},
        {x: 2, y: 2},
      ]

      registerDeepPositionRecursively(positionMap, deepPosition, {previousChildPosition: {x: 0, y: 0}})
      registerDeepPositionRecursively(positionMap, deepPosition)
      unregisterDeepPositionRecursively(positionMap, deepPosition, {cleanUpInfo: true})
      expect(hasDeepPosition(positionMap, deepPosition)).toBe(true)
      expect(hasDeepPosition(positionMap, [{x: 1, y: 1}])).toBe(true)
      expect(getDeepPositionInfo(positionMap, deepPosition)?.previousChildPosition).toBeUndefined()
      expect(getDeepPositionInfo(positionMap, [{x: 1, y: 1}])?.previousChildPosition).toBeUndefined()
      unregisterDeepPositionRecursively(positionMap, deepPosition, {cleanUpInfo: true})
      expect(getDeepPositionInfo(positionMap, deepPosition)?.previousChildPosition).toBeUndefined()
      expect(getDeepPositionInfo(positionMap, [{x: 1, y: 1}])?.previousChildPosition).toBeUndefined()
    })
  })

  describe('updateDeepPositionPayloadWithKey', () => {
    it('should update payload for existing position', () => {
      const positionMap = createPositionMap()
      const key = '1,1'

      registerDeepPositionWithKey(positionMap, key)
      updateDeepPositionPayloadWithKey(positionMap, key, {previousChildPosition: {x: 2, y: 2}})

      const info = getDeepPositionInfoWithKey(positionMap, key)

      expect(info?.previousChildPosition).toEqual({x: 2, y: 2})
    })

    it('should preserve count when updating payload', () => {
      const positionMap = createPositionMap()
      const key = '1,1'

      registerDeepPositionWithKey(positionMap, key)
      registerDeepPositionWithKey(positionMap, key)
      updateDeepPositionPayloadWithKey(positionMap, key, {previousChildPosition: {x: 2, y: 2}})

      const info = getDeepPositionInfoWithKey(positionMap, key)

      expect(info?.count).toBe(2)
      expect(info?.previousChildPosition).toEqual({x: 2, y: 2})
    })

    it('should update payload if key is not found', () => {
      const positionMap = createPositionMap()
      const key = '999,999'
      const payload = {previousChildPosition: {x: 0, y: 0}}

      updateDeepPositionPayloadWithKey(positionMap, key, payload)

      const info = getDeepPositionInfoWithKey(positionMap, key)

      expect(info?.count).toBe(0)
      expect(info?.previousChildPosition).toEqual({x: 0, y: 0})
    })
  })

  describe('getNextDeepPosition', () => {
    it('should return next deep position for valid index', () => {
      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]
      const direction: Direction = getDirection('right')

      const result = getNextDeepPosition(deepPosition, 0, direction)

      expect(result).toEqual([
        {x: 1, y: 0},
        {x: 1, y: 1},
      ])
    })

    it('should return null for invalid index (negative)', () => {
      const deepPosition: DeepPosition = [{x: 0, y: 0}]
      const direction: Direction = getDirection('right')

      const result = getNextDeepPosition(deepPosition, -1, direction)

      expect(result).toBeNull()
    })

    it('should return null for invalid index (out of bounds)', () => {
      const deepPosition: DeepPosition = [{x: 0, y: 0}]
      const direction: Direction = getDirection('right')

      const result = getNextDeepPosition(deepPosition, 1, direction)

      expect(result).toBeNull()
    })

    it('should handle different directions', () => {
      const deepPosition: DeepPosition = [{x: 1, y: 1}]
      const upDirection: Direction = getDirection('up')
      const downDirection: Direction = getDirection('down')
      const leftDirection: Direction = getDirection('left')
      const rightDirection: Direction = getDirection('right')

      expect(getNextDeepPosition(deepPosition, 0, upDirection)).toEqual([{x: 1, y: 0}])
      expect(getNextDeepPosition(deepPosition, 0, downDirection)).toEqual([{x: 1, y: 2}])
      expect(getNextDeepPosition(deepPosition, 0, leftDirection)).toEqual([{x: 0, y: 1}])
      expect(getNextDeepPosition(deepPosition, 0, rightDirection)).toEqual([{x: 2, y: 1}])
    })
  })

  describe('moveDeepPosition', () => {
    it('should move to next position if it exists in map', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 0, y: 0}]
      const nextPosition: DeepPosition = [{x: 1, y: 0}]
      const direction: Direction = getDirection('right')

      registerDeepPosition(positionMap, nextPosition)

      const result = moveDeepPosition(positionMap, deepPosition, 0, direction)

      expect(result).toEqual(nextPosition)
    })

    it('should return null if next position does not exist within limit', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 0, y: 0}]
      const direction: Direction = getDirection('right')

      const result = moveDeepPosition(positionMap, deepPosition, 0, direction, {limit: 5})

      expect(result).toBeNull()
    })

    it('should search up to limit', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 0, y: 0}]
      const targetPosition: DeepPosition = [{x: 3, y: 0}]
      const direction: Direction = getDirection('right')

      registerDeepPosition(positionMap, targetPosition)

      const result = moveDeepPosition(positionMap, deepPosition, 0, direction, {limit: 5})

      expect(result).toEqual(targetPosition)
    })

    it('should return null if limit is exceeded', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 0, y: 0}]
      const targetPosition: DeepPosition = [{x: 10, y: 0}]
      const direction: Direction = getDirection('right')

      registerDeepPosition(positionMap, targetPosition)

      const result = moveDeepPosition(positionMap, deepPosition, 0, direction, {limit: 5})

      expect(result).toBeNull()
    })

    it('should use default options', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 0, y: 0}]
      const nextPosition: DeepPosition = [{x: 1, y: 0}]
      const direction: Direction = getDirection('right')

      registerDeepPosition(positionMap, nextPosition)

      const result = moveDeepPosition(positionMap, deepPosition, 0, direction)

      expect(result).toEqual(nextPosition)
    })
  })

  describe('findNextDeepPosition', () => {
    it('should return deep position if it exists in map', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 0, y: 1},
        {x: 0, y: 0},
      ]
      const direction: Direction = getDirection('right')

      registerDeepPositionRecursively(positionMap, deepPosition)
      const result = findNextDeepPosition(positionMap, deepPosition, 2, direction)

      expect(result).toEqual(deepPosition)
    })

    it('should find next deep position if it exists in map', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 0, y: 1},
        {x: 0, y: 0},
      ]

      const nextPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 0, y: 1},
        {x: 1, y: 0},
      ]
      const direction: Direction = getDirection('right')

      registerDeepPositionRecursively(positionMap, nextPosition)

      const result = findNextDeepPosition(positionMap, deepPosition, 2, direction)

      expect(result).toEqual(nextPosition)
    })
  })

  describe('getDeepPositionInfo', () => {
    it('should return info for existing position', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 1, y: 1}]
      const payload = {previousChildPosition: {x: 0, y: 0}}

      registerDeepPosition(positionMap, deepPosition, payload)

      const info = getDeepPositionInfo(positionMap, deepPosition)

      expect(info).toBeDefined()
      expect(info?.count).toBe(1)
      expect(info?.previousChildPosition).toEqual({x: 0, y: 0})
    })

    it('should return undefined for non-existent position', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 999, y: 999}]

      const info = getDeepPositionInfo(positionMap, deepPosition)

      expect(info).toBeUndefined()
    })
  })

  describe('getDeepPositionInfoWithKey', () => {
    it('should return info for existing key', () => {
      const positionMap = createPositionMap()
      const key = '1,1'

      registerDeepPositionWithKey(positionMap, key)

      const info = getDeepPositionInfoWithKey(positionMap, key)

      expect(info).toBeDefined()
      expect(info?.count).toBe(1)
    })

    it('should return undefined for non-existent key', () => {
      const positionMap = createPositionMap()

      const info = getDeepPositionInfoWithKey(positionMap, '999,999')

      expect(info).toBeUndefined()
    })
  })

  describe('getParentInfo', () => {
    it('should return parent info for valid deep index', () => {
      const positionMap = createPositionMap()
      const parentPosition: DeepPosition = [{x: 0, y: 0}]

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      registerDeepPosition(positionMap, parentPosition)

      const info = getParentInfo(positionMap, deepPosition, 1)

      expect(info).toBeDefined()
      expect(info?.count).toBe(1)
    })

    it('should return undefined if parent does not exist', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      const info = getParentInfo(positionMap, deepPosition, 1)

      expect(info).toBeUndefined()
    })
  })

  describe('getPreviousPosition', () => {
    it('should return previous child position from parent info', () => {
      const positionMap = createPositionMap()
      const parentPosition: DeepPosition = [{x: 0, y: 0}]

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      registerDeepPosition(positionMap, parentPosition, {previousChildPosition: {x: 2, y: 2}})

      const result = getPreviousPosition(positionMap, deepPosition, 1)

      expect(result).toEqual({x: 2, y: 2})
    })

    it('should return default position if parent info does not exist', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      const result = getPreviousPosition(positionMap, deepPosition, 1)

      expect(result).toEqual(DEFAULT_FILL_OPTIONS.defaultPosition)
    })

    it('should return default position if parent has no previousChildPosition', () => {
      const positionMap = createPositionMap()
      const parentPosition: DeepPosition = [{x: 0, y: 0}]

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      registerDeepPosition(positionMap, parentPosition)

      const result = getPreviousPosition(positionMap, deepPosition, 1)

      expect(result).toEqual(DEFAULT_FILL_OPTIONS.defaultPosition)
    })

    it('should use custom default position', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      const customOptions = {
        ...DEFAULT_FILL_OPTIONS,
        defaultPosition: {x: 5, y: 5},
      }

      const result = getPreviousPosition(positionMap, deepPosition, 1, customOptions)

      expect(result).toEqual({x: 5, y: 5})
    })
  })

  describe('restoreDeepPosition', () => {
    it('should restore deep position with previous position', () => {
      const positionMap = createPositionMap()
      const parentPosition: DeepPosition = [{x: 0, y: 0}]

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      const nextPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 2, y: 2},
      ]

      registerDeepPositionRecursively(positionMap, parentPosition, {previousChildPosition: {x: 2, y: 2}})
      registerDeepPositionRecursively(positionMap, nextPosition)

      const result = restoreDeepPosition(positionMap, deepPosition, 1)

      expect(result).toEqual([
        {x: 0, y: 0},
        {x: 2, y: 2},
      ])
    })

    it('should use default position if previous position does not exist', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      const nextPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 0, y: 0},
      ]

      registerDeepPositionRecursively(positionMap, nextPosition)

      const result = restoreDeepPosition(positionMap, deepPosition, 1)

      expect(result).toEqual([{x: 0, y: 0}, DEFAULT_FILL_OPTIONS.defaultPosition])
    })
  })

  describe('fillPreviousDeepPosition', () => {
    it('should fill all positions from start index', () => {
      const positionMap = createPositionMap()

      const parent: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      const nextPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 4, y: 4},
      ]

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 2, y: 2},
      ]

      registerDeepPositionRecursively(positionMap, nextPosition)
      registerDeepPositionRecursively(positionMap, deepPosition)
      registerDeepPositionRecursively(positionMap, parent, {previousChildPosition: {x: 4, y: 4}})

      const result = fillPreviousDeepPosition(positionMap, deepPosition, 2)

      expect(result).toEqual([
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 4, y: 4},
      ])
    })

    it('should fill two deep positions', () => {
      const positionMap = createPositionMap()

      const parent: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 2, y: 2},
        {x: 3, y: 3},
      ]

      const nextPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 4, y: 4},
        {x: 0, y: 0},
      ]

      registerDeepPositionRecursively(positionMap, parent, {previousChildPosition: {x: 4, y: 4}})
      registerDeepPositionRecursively(positionMap, nextPosition)

      const result = fillPreviousDeepPosition(positionMap, deepPosition, 2)

      expect(result).toEqual([
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 4, y: 4},
        {x: 0, y: 0},
      ])
    })

    it('should fill with default position if parent info is missing', () => {
      const positionMap = createPositionMap()

      const parent: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 2, y: 2},
        {x: 3, y: 3},
      ]

      const nextPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 4, y: 4},
        {x: 8, y: 5},
      ]

      registerDeepPositionRecursively(positionMap, parent, {previousChildPosition: {x: 4, y: 4}})
      registerDeepPositionRecursively(positionMap, nextPosition)

      const result = fillPreviousDeepPosition(
        positionMap,
        deepPosition,
        2,
        getDirection('right'),
        deepPosition.length,
        {
          defaultPosition: {x: 5, y: 5},
        },
      ) // ?

      expect(result).toEqual([
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 4, y: 4},
        {x: 8, y: 5},
      ])
    })

    it('should use default position when parent info is missing', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
        {x: 2, y: 2},
      ]

      const nextPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 0, y: 0},
        {x: 0, y: 0},
      ]

      registerDeepPositionRecursively(positionMap, nextPosition)

      const result = fillPreviousDeepPosition(positionMap, deepPosition, 1)

      expect(result).toEqual([{x: 0, y: 0}, DEFAULT_FILL_OPTIONS.defaultPosition, DEFAULT_FILL_OPTIONS.defaultPosition])
    })
  })

  describe('jumpDeepPosition', () => {
    it('should move to next position at deepest level', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      const nextPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 2, y: 1},
      ]
      const direction: Direction = getDirection('right')

      registerDeepPosition(positionMap, nextPosition)

      const result = jumpDeepPosition(positionMap, deepPosition, direction)

      expect(result).toEqual(nextPosition)
    })

    it('should jump to parent level with default position', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      const nextPosition: DeepPosition = [
        {x: 1, y: 0},
        {x: 1, y: 0},
      ]
      const direction: Direction = getDirection('right')

      registerDeepPositionRecursively(positionMap, nextPosition)

      const result = jumpDeepPosition(positionMap, deepPosition, direction)

      expect(result).toEqual([
        {x: 1, y: 0},
        {x: 1, y: 0},
      ])
    })

    it('should return null if no position found at any level', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]
      const direction: Direction = getDirection('right')

      const result = jumpDeepPosition(positionMap, deepPosition, direction)

      expect(result).toBeNull()
    })

    it('should fill previous positions after jump', () => {
      const positionMap = createPositionMap()
      const parent1: DeepPosition = [{x: 1, y: 0}]

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      const nextPosition: DeepPosition = [
        {x: 1, y: 0},
        {x: 6, y: 5},
      ]
      const direction: Direction = getDirection('right')

      registerDeepPositionRecursively(positionMap, nextPosition)
      registerDeepPositionRecursively(positionMap, parent1, {previousChildPosition: {x: 5, y: 5}})

      const result = jumpDeepPosition(positionMap, deepPosition, direction)

      expect(result).toEqual(nextPosition)
    })

    it('should fill previous positions after jump with nowhere to next', () => {
      const positionMap = createPositionMap()
      const parent1: DeepPosition = [{x: 1, y: 0}]

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]
      const nextPosition: DeepPosition = [{x: 1, y: 0}]
      const direction: Direction = getDirection('right')

      registerDeepPositionRecursively(positionMap, nextPosition)
      registerDeepPositionRecursively(positionMap, parent1, {previousChildPosition: {x: 5, y: 5}})

      const result = jumpDeepPosition(positionMap, deepPosition, direction)

      expect(result).toEqual(nextPosition)
    })

    it('should search and move to next position with limit', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 0, y: 0}]
      const targetPosition: DeepPosition = [{x: 3, y: 0}]
      const direction: Direction = getDirection('right')

      registerDeepPosition(positionMap, targetPosition)

      const result = jumpDeepPosition(positionMap, deepPosition, direction, {limit: 5})

      expect(result).toEqual(targetPosition)
    })

    it('should search and jump to next position with limit', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 0, y: 0},
        {x: 1, y: 0},
      ]

      const targetPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 3, y: 0},
        {x: 2, y: 0},
      ]
      const direction: Direction = getDirection('right')

      registerDeepPositionRecursively(positionMap, targetPosition)

      const result = jumpDeepPosition(positionMap, deepPosition, direction, {limit: 5})

      expect(result).toEqual([
        {x: 0, y: 0},
        {x: 3, y: 0},
        {x: 2, y: 0},
      ])
    })

    it('should return null if limit is exceeded', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = [{x: 0, y: 0}]
      const targetPosition: DeepPosition = [{x: 10, y: 0}]
      const direction: Direction = getDirection('right')

      registerDeepPosition(positionMap, targetPosition)

      const result = jumpDeepPosition(positionMap, deepPosition, direction, {limit: 5})

      expect(result).toBeNull()
    })

    it('should jump to parent level with jump limit index', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      const nextPosition: DeepPosition = [
        {x: 1, y: 0},
        {x: 0, y: 0},
      ]
      const direction: Direction = getDirection('right')

      registerDeepPositionRecursively(positionMap, nextPosition)

      const result1 = jumpDeepPosition(positionMap, deepPosition, direction, {jumpLimitIndex: 1})

      expect(result1).toEqual(null)

      const result2 = jumpDeepPosition(positionMap, deepPosition, direction, {jumpLimitIndex: 0})

      expect(result2).toEqual(nextPosition)
    })
  })

  describe('savePreviousDeepPosition', () => {
    it('should save previous deep position', () => {
      const positionMap = createPositionMap()

      const deepPosition: DeepPosition = [
        {x: 0, y: 0},
        {x: 1, y: 1},
      ]

      savePreviousDeepPosition(positionMap, deepPosition)
      expect(getDeepPositionInfoWithKey(positionMap, '')?.previousChildPosition).toEqual({x: 0, y: 0})
      expect(getDeepPositionInfoWithKey(positionMap, '0,0')?.previousChildPosition).toEqual({x: 1, y: 1})
    })

    it('should not save empty deep position', () => {
      const positionMap = createPositionMap()
      const deepPosition: DeepPosition = []

      savePreviousDeepPosition(positionMap, deepPosition)
      expect(getDeepPositionInfoWithKey(positionMap, 'root')?.previousChildPosition).toBeUndefined()
    })
  })

  describe('default options', () => {
    it('should have correct default key options', () => {
      expect(DEFAULT_KEY_OPTIONS.connector).toBe('|')
      expect(DEFAULT_KEY_OPTIONS.separator).toBe(',')
    })

    it('should have correct default move options', () => {
      expect(DEFAULT_MOVE_OPTIONS.connector).toBe('|')
      expect(DEFAULT_MOVE_OPTIONS.separator).toBe(',')
      expect(DEFAULT_MOVE_OPTIONS.limit).toBe(DEFAULT_MAX_SEARCH_LENGTH)
    })

    it('should have correct default fill options', () => {
      expect(DEFAULT_FILL_OPTIONS.connector).toBe('|')
      expect(DEFAULT_FILL_OPTIONS.separator).toBe(',')
      expect(DEFAULT_FILL_OPTIONS.defaultPosition).toEqual({x: 0, y: 0})
    })

    it('should have correct default jump options', () => {
      expect(DEFAULT_JUMP_OPTIONS.connector).toBe('|')
      expect(DEFAULT_JUMP_OPTIONS.separator).toBe(',')
      expect(DEFAULT_JUMP_OPTIONS.limit).toBe(DEFAULT_MAX_SEARCH_LENGTH)
      expect(DEFAULT_JUMP_OPTIONS.defaultPosition).toEqual({x: 0, y: 0})
    })
  })
})
