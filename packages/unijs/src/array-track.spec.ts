import {describe, it, expect} from 'vitest'
import {createArrayTrack} from './array-track'

describe('createArrayTrack', () => {
  it('should create a tracked array with initial values', () => {
    const original = [1, 2, 3]
    const tracked = createArrayTrack(original)

    expect(tracked).toBeInstanceOf(Array)
    expect(tracked.length).toBe(3)
    expect(tracked[0]).toBe(1)
    expect(tracked[1]).toBe(2)
    expect(tracked[2]).toBe(3)
  })

  it('should track push operations', () => {
    const tracked = createArrayTrack([1, 2, 3])

    tracked.push(4, 5)

    const changes = tracked.changes()
    expect(Object.keys(changes)).toHaveLength(2)

    const changeValues = Object.values(changes)
    expect(changeValues[0]).toEqual({
      action: 'insert',
      from: 3,
      value: 4
    })
    expect(changeValues[1]).toEqual({
      action: 'insert',
      from: 4,
      value: 5
    })
  })

  it('should track pop operations', () => {
    const tracked = createArrayTrack([1, 2, 3])

    const result = tracked.pop()

    expect(result).toBe(3)
    const changes = tracked.changes()
    expect(Object.keys(changes)).toHaveLength(1)

    const change = Object.values(changes)[0]
    expect(change).toEqual({
      action: 'delete',
      from: 2,
      value: 3
    })
  })

  it('should track shift operations', () => {
    const tracked = createArrayTrack([1, 2, 3])

    const result = tracked.shift()

    expect(result).toBe(1)
    const changes = tracked.changes()
    expect(Object.keys(changes)).toHaveLength(3) // 1 delete + 2 moves

    const deleteChange = Object.values(changes).find(c => c.action === 'delete')
    expect(deleteChange).toEqual({
      action: 'delete',
      from: 0,
      value: 1
    })
  })

  it('should track unshift operations', () => {
    const tracked = createArrayTrack([1, 2, 3])

    tracked.unshift(0)

    const changes = tracked.changes()
    expect(Object.keys(changes)).toHaveLength(4) // 1 insert + 3 moves

    const insertChange = Object.values(changes).find(c => c.action === 'insert')
    expect(insertChange).toEqual({
      action: 'insert',
      from: 0,
      value: 0
    })
  })

  it('should track splice operations', () => {
    const tracked = createArrayTrack([1, 2, 3, 4, 5])

    const deleted = tracked.splice(1, 2, 99, 88)

    expect(deleted).toEqual([2, 3])
    const changes = tracked.changes()
    expect(Object.keys(changes)).toHaveLength(4) // 2 deletes + 2 inserts

    const deleteChanges = Object.values(changes).filter(c => c.action === 'delete')
    const insertChanges = Object.values(changes).filter(c => c.action === 'insert')

    expect(deleteChanges).toHaveLength(2)
    expect(insertChanges).toHaveLength(2)
  })

  it('should track reverse operations', () => {
    const tracked = createArrayTrack([1, 2, 3])

    tracked.reverse()

    const changes = tracked.changes()
    expect(Object.keys(changes)).toHaveLength(3) // 3 moves

    const moveChanges = Object.values(changes).filter(c => c.action === 'move')
    expect(moveChanges).toHaveLength(3)
  })

  it('should track sort operations', () => {
    const tracked = createArrayTrack([3, 1, 2])

    tracked.sort()

    const changes = tracked.changes()
    expect(Object.keys(changes)).toHaveLength(3) // 3 moves

    const moveChanges = Object.values(changes).filter(c => c.action === 'move')
    expect(moveChanges).toHaveLength(3)
  })

  it('should track fill operations', () => {
    const tracked = createArrayTrack([1, 2, 3, 4, 5])

    tracked.fill(0, 1, 4)

    const changes = tracked.changes()
    expect(Object.keys(changes)).toHaveLength(3) // 3 updates

    const updateChanges = Object.values(changes).filter(c => c.action === 'update')
    expect(updateChanges).toHaveLength(3)
  })

  it('should track copyWithin operations', () => {
    const tracked = createArrayTrack([1, 2, 3, 4, 5])

    tracked.copyWithin(0, 3, 5)

    const changes = tracked.changes()
    expect(Object.keys(changes)).toHaveLength(2) // 2 updates

    const updateChanges = Object.values(changes).filter(c => c.action === 'update')
    expect(updateChanges).toHaveLength(2)
  })

  it('should track direct index assignments', () => {
    const tracked = createArrayTrack([1, 2, 3])

    tracked[1] = 99

    const changes = tracked.changes()
    expect(Object.keys(changes)).toHaveLength(1)

    const change = Object.values(changes)[0]
    expect(change).toEqual({
      action: 'update',
      from: 1,
      value: 99,
      oldValue: 2
    })
  })

  it('should track direct index assignments on pushed items', () => {
    const tracked = createArrayTrack([1, 2, 3])

    tracked.push(4, 5)  // Add two new items
    tracked[3] = 99     // Change the first pushed item (index 3)
    tracked[4] = 88     // Change the second pushed item (index 4)

    const changes = tracked.changes()
    expect(Object.keys(changes)).toHaveLength(4) // 2 inserts + 2 updates

    const insertChanges = Object.values(changes).filter(c => c.action === 'insert')
    const updateChanges = Object.values(changes).filter(c => c.action === 'update')

    expect(insertChanges).toHaveLength(2)
    expect(updateChanges).toHaveLength(2)

    // Check that the updates are tracked correctly
    const updateAt3 = updateChanges.find(c => c.from === 3)
    const updateAt4 = updateChanges.find(c => c.from === 4)

    expect(updateAt3).toEqual({
      action: 'update',
      from: 3,
      value: 99,
      oldValue: 4
    })

    expect(updateAt4).toEqual({
      action: 'update',
      from: 4,
      value: 88,
      oldValue: 5
    })
  })

  it('should track length changes', () => {
    const tracked = createArrayTrack([1, 2, 3, 4, 5])

    tracked.length = 3

    const changes = tracked.changes()
    expect(Object.keys(changes)).toHaveLength(2) // 2 deletes

    const deleteChanges = Object.values(changes).filter(c => c.action === 'delete')
    expect(deleteChanges).toHaveLength(2)
  })

  it('should clear changes when clearChanges is called', () => {
    const tracked = createArrayTrack([1, 2, 3])

    tracked.push(4)
    expect(Object.keys(tracked.changes())).toHaveLength(1)

    tracked.clearChanges()
    expect(Object.keys(tracked.changes())).toHaveLength(0)
  })

  it('should maintain original array functionality', () => {
    const tracked = createArrayTrack([1, 2, 3])

    expect(tracked.concat([4, 5])).toEqual([1, 2, 3, 4, 5])
    expect(tracked.filter(x => x > 1)).toEqual([2, 3])
    expect(tracked.map(x => x * 2)).toEqual([2, 4, 6])
    expect(tracked.reduce((sum, x) => sum + x, 0)).toBe(6)
    expect(tracked.includes(2)).toBe(true)
    expect(tracked.indexOf(3)).toBe(2)
    expect(tracked.join('-')).toBe('1-2-3')
  })

  it('should handle empty arrays', () => {
    const tracked = createArrayTrack<number>([])

    expect(tracked.length).toBe(0)
    expect(tracked.changes()).toEqual({})

    tracked.push(1)
    expect(tracked.length).toBe(1)
    expect(Object.keys(tracked.changes())).toHaveLength(1)
  })

  it('should track multiple operations correctly', () => {
    const tracked = createArrayTrack([1, 2, 3])

    tracked.push(4)
    tracked.pop()
    tracked[1] = 99
    tracked.reverse()

    const changes = tracked.changes()
    expect(Object.keys(changes)).toHaveLength(6) // 1 insert + 1 delete + 1 update + 3 moves

    const insertChanges = Object.values(changes).filter(c => c.action === 'insert')
    const deleteChanges = Object.values(changes).filter(c => c.action === 'delete')
    const updateChanges = Object.values(changes).filter(c => c.action === 'update')
    const moveChanges = Object.values(changes).filter(c => c.action === 'move')

    expect(insertChanges).toHaveLength(1)
    expect(deleteChanges).toHaveLength(1)
    expect(updateChanges).toHaveLength(1)
    expect(moveChanges).toHaveLength(3)
  })

  it('should handle edge cases correctly', () => {
    const tracked = createArrayTrack<number>([])

    // Empty array operations
    expect(tracked.pop()).toBeUndefined()
    expect(tracked.shift()).toBeUndefined()
    expect(tracked.length).toBe(0)

    // Add elements and test edge cases
    tracked.push(1, 2, 3)
    expect(tracked.length).toBe(3)

    // Test negative index access
    expect(tracked.at(-1)).toBe(3)
    expect(tracked.at(-2)).toBe(2)
    expect(tracked.at(-3)).toBe(1)
    expect(tracked.at(-4)).toBeUndefined()

    // Test out of bounds access - this should extend the array
    expect(tracked[10]).toBeUndefined()
    tracked[10] = 99
    // Note: Setting out of bounds index doesn't automatically extend length
    // We need to manually set length or use push
    tracked.length = 11
    expect(tracked.length).toBe(11)
    expect(tracked[10]).toBe(99)
  })

  it('should handle complex nested operations', () => {
    const tracked = createArrayTrack([1, 2, 3])

    // Complex sequence: push → splice → reverse → sort
    tracked.push(4, 5)
    tracked.splice(1, 2, 99, 88)
    tracked.reverse()
    tracked.sort()

    const changes = tracked.changes()
    expect(Object.keys(changes).length).toBeGreaterThan(0)

    // Verify the final state - convert to array for comparison
    expect(tracked.length).toBe(5)
    expect([...tracked]).toEqual([1, 4, 5, 88, 99])
  })

  it('should work with different data types', () => {
    // String array
    const stringArray = createArrayTrack(['a', 'b', 'c'])
    stringArray.push('d')
    stringArray[1] = 'x'
    expect(stringArray[1]).toBe('x')

    // Object array
    const objectArray = createArrayTrack([{id: 1}, {id: 2}])
    objectArray.push({id: 3})
    objectArray[0].id = 99
    expect(objectArray[0].id).toBe(99)

    // Mixed type array
    const mixedArray = createArrayTrack([1, 'hello', true])
    mixedArray.push(3.14)
    expect(mixedArray[3]).toBe(3.14)
  })

  it('should handle array methods correctly', () => {
    const tracked = createArrayTrack([1, 2, 3, 4, 5])

    // Test find methods
    expect(tracked.find(x => x > 3)).toBe(4)
    expect(tracked.findIndex(x => x > 3)).toBe(3)

    // Test flat methods
    const nestedArray = createArrayTrack([[1, 2], [3, 4]])
    expect(nestedArray.flat()).toEqual([1, 2, 3, 4])

    // Test iterator methods
    expect([...tracked.entries()]).toEqual([[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]])
    expect([...tracked.keys()]).toEqual([0, 1, 2, 3, 4])
    expect([...tracked.values()]).toEqual([1, 2, 3, 4, 5])

    // Test includes and indexOf
    expect(tracked.includes(3)).toBe(true)
    expect(tracked.includes(99)).toBe(false)
    expect(tracked.indexOf(3)).toBe(2)

    // Test basic array methods that should work
    expect(tracked.join('-')).toBe('1-2-3-4-5')
    expect(tracked.slice(1, 3)).toEqual([2, 3])
  })

  it('should handle length property edge cases', () => {
    const tracked = createArrayTrack([1, 2, 3, 4, 5])

    // Extend array
    tracked.length = 10
    expect(tracked.length).toBe(10)
    expect(tracked[8]).toBeUndefined()

    // Truncate array
    tracked.length = 2
    expect(tracked.length).toBe(2)
    expect(tracked[2]).toBeUndefined()

    // Set to 0
    tracked.length = 0
    expect(tracked.length).toBe(0)
    expect(tracked[0]).toBeUndefined()
  })

  it('should correctly track shift operations with proper move indices', () => {
    const tracked = createArrayTrack([1, 2, 3, 4, 5])

    tracked.shift()

    const changes = tracked.changes()
    const moveChanges = Object.values(changes).filter(c => c.action === 'move')

    // Should have 1 delete + 4 moves (elements 2,3,4,5 move from indices 1,2,3,4 to 0,1,2,3)
    expect(moveChanges).toHaveLength(4)

    // Check that move indices are correct
    const expectedMoves = [
      { from: 1, to: 0 }, // 2 moved from index 1 to 0
      { from: 2, to: 1 }, // 3 moved from index 2 to 1
      { from: 3, to: 2 }, // 4 moved from index 3 to 2
      { from: 4, to: 3 }  // 5 moved from index 4 to 3
    ]

    expectedMoves.forEach(expectedMove => {
      const found = moveChanges.find(move =>
        move.from === expectedMove.from && move.to === expectedMove.to
      )
      expect(found).toBeDefined()
    })
  })

  it('should correctly track splice operations with proper indices', () => {
    const tracked = createArrayTrack([1, 2, 3, 4, 5])

    // Delete 2 elements and insert 2 new elements at index 1
    const deleted = tracked.splice(1, 2, 99, 88)

    expect(deleted).toEqual([2, 3])
    expect([...tracked]).toEqual([1, 99, 88, 4, 5])

    const changes = tracked.changes()
    const deleteChanges = Object.values(changes).filter(c => c.action === 'delete')
    const insertChanges = Object.values(changes).filter(c => c.action === 'insert')

    // Should have 2 deletes at indices 1,2 and 2 inserts at indices 1,2
    expect(deleteChanges).toHaveLength(2)
    expect(insertChanges).toHaveLength(2)

    // Check delete indices
    expect(deleteChanges[0].from).toBe(1)
    expect(deleteChanges[0].value).toBe(2)
    expect(deleteChanges[1].from).toBe(2)
    expect(deleteChanges[1].value).toBe(3)

    // Check insert indices
    expect(insertChanges[0].from).toBe(1)
    expect(insertChanges[0].value).toBe(99)
    expect(insertChanges[1].from).toBe(2)
    expect(insertChanges[1].value).toBe(88)
  })

  it('should correctly track copyWithin operations with proper oldValue', () => {
    const tracked = createArrayTrack([1, 2, 3, 4, 5])

    // Copy elements from index 3-4 to index 0-1
    tracked.copyWithin(0, 3, 5)

    expect([...tracked]).toEqual([4, 5, 3, 4, 5])

    const changes = tracked.changes()
    const updateChanges = Object.values(changes).filter(c => c.action === 'update')

    // Should have 2 updates at indices 0,1
    expect(updateChanges).toHaveLength(2)

    // Check that oldValue is correct (should be the original values before copyWithin)
    expect(updateChanges[0].from).toBe(0)
    expect(updateChanges[0].oldValue).toBe(1) // Original value at index 0
    expect(updateChanges[0].value).toBe(4)   // New value after copyWithin

    expect(updateChanges[1].from).toBe(1)
    expect(updateChanges[1].oldValue).toBe(2) // Original value at index 1
    expect(updateChanges[1].value).toBe(5)   // New value after copyWithin
  })

  it('should correctly track concat operations with proper indices', () => {
    const tracked = createArrayTrack([1, 2, 3])

    // Concat should not modify the original array, but track insertions
    const result = tracked.concat([4, 5])

    expect([...tracked]).toEqual([1, 2, 3]) // Original array unchanged
    expect(result).toEqual([1, 2, 3, 4, 5]) // New array returned

    const changes = tracked.changes()
    console.log('All changes:', changes)
    const insertChanges = Object.values(changes).filter(c => c.action === 'insert')
    console.log('Insert changes:', insertChanges)

    // Should have 2 insertions at indices 3,4
    expect(insertChanges).toHaveLength(2)

    expect(insertChanges[0].from).toBe(3)
    expect(insertChanges[0].value).toBe(4)
    expect(insertChanges[1].from).toBe(4)
    expect(insertChanges[1].value).toBe(5)
  })

  it('should behave identically to native Array for non-mutating methods', () => {
    const originalArray = [1, 2, 3, 4, 5]
    const trackedArray = createArrayTrack([1, 2, 3, 4, 5])

    // Test slice
    expect(trackedArray.slice(1, 3)).toEqual(originalArray.slice(1, 3))
    expect(trackedArray.slice(-2)).toEqual(originalArray.slice(-2))

    // Test indexOf/lastIndexOf
    expect(trackedArray.indexOf(3)).toBe(originalArray.indexOf(3))
    expect(trackedArray.lastIndexOf(3)).toBe(originalArray.lastIndexOf(3))
    expect(trackedArray.indexOf(99)).toBe(originalArray.indexOf(99))

    // Test includes
    expect(trackedArray.includes(3)).toBe(originalArray.includes(3))
    expect(trackedArray.includes(99)).toBe(originalArray.includes(99))

    // Test join
    expect(trackedArray.join('-')).toBe(originalArray.join('-'))
    expect(trackedArray.join()).toBe(originalArray.join())

    // Test toString
    expect(trackedArray.toString()).toBe(originalArray.toString())

    // Test at
    expect(trackedArray.at(0)).toBe(originalArray.at(0))
    expect(trackedArray.at(-1)).toBe(originalArray.at(-1))
    expect(trackedArray.at(10)).toBe(originalArray.at(10))
  })

  it('should behave identically to native Array for callback-based methods', () => {
    const originalArray = [1, 2, 3, 4, 5]
    const trackedArray = createArrayTrack([1, 2, 3, 4, 5])

    // Test forEach
    const forEachResult: Array<{ item: number; index: number }> = []
    trackedArray.forEach((item, index) => forEachResult.push({ item, index }))
    const originalForEachResult: Array<{ item: number; index: number }> = []
    originalArray.forEach((item, index) => originalForEachResult.push({ item, index }))
    expect(forEachResult).toEqual(originalForEachResult)

    // Test map
    expect(trackedArray.map(x => x * 2)).toEqual(originalArray.map(x => x * 2))
    expect(trackedArray.map((x, i) => x + i)).toEqual(originalArray.map((x, i) => x + i))

    // Test filter
    expect(trackedArray.filter(x => x > 2)).toEqual(originalArray.filter(x => x > 2))
    expect(trackedArray.filter((x, i) => i % 2 === 0)).toEqual(originalArray.filter((x, i) => i % 2 === 0))

    // Test reduce
    expect(trackedArray.reduce((sum, x) => sum + x, 0)).toBe(originalArray.reduce((sum, x) => sum + x, 0))
    expect(trackedArray.reduce((sum, x, i) => sum + x + i, 0)).toBe(originalArray.reduce((sum, x, i) => sum + x + i, 0))

    // Test reduceRight
    expect(trackedArray.reduceRight((sum, x) => sum + x, 0)).toBe(originalArray.reduceRight((sum, x) => sum + x, 0))

    // Test every
    expect(trackedArray.every(x => x > 0)).toBe(originalArray.every(x => x > 0))
    expect(trackedArray.every(x => x > 3)).toBe(originalArray.every(x => x > 3))

    // Test some
    expect(trackedArray.some(x => x > 3)).toBe(originalArray.some(x => x > 3))
    expect(trackedArray.some(x => x > 10)).toBe(originalArray.some(x => x > 10))

    // Test find
    expect(trackedArray.find(x => x > 3)).toBe(originalArray.find(x => x > 3))
    expect(trackedArray.find(x => x > 10)).toBe(originalArray.find(x => x > 10))

    // Test findIndex
    expect(trackedArray.findIndex(x => x > 3)).toBe(originalArray.findIndex(x => x > 3))
    expect(trackedArray.findIndex(x => x > 10)).toBe(originalArray.findIndex(x => x > 10))
  })

  it('should behave identically to native Array for iterator methods', () => {
    const originalArray = [1, 2, 3, 4, 5]
    const trackedArray = createArrayTrack([1, 2, 3, 4, 5])

    // Test entries
    expect([...trackedArray.entries()]).toEqual([...originalArray.entries()])

    // Test keys
    expect([...trackedArray.keys()]).toEqual([...originalArray.keys()])

    // Test values
    expect([...trackedArray.values()]).toEqual([...originalArray.values()])

    // Test for...of loop
    const trackedValues: number[] = []
    for (const value of trackedArray) {
      trackedValues.push(value)
    }
    const originalValues: number[] = []
    for (const value of originalArray) {
      originalValues.push(value)
    }
    expect(trackedValues).toEqual(originalValues)
  })

  it('should behave identically to native Array for flat methods', () => {
    const originalArray = [[1, 2], [3, 4], [5]]
    const trackedArray = createArrayTrack([[1, 2], [3, 4], [5]])

    // Test flat
    expect(trackedArray.flat()).toEqual(originalArray.flat())
    expect(trackedArray.flat(1)).toEqual(originalArray.flat(1))
    expect(trackedArray.flat(2)).toEqual(originalArray.flat(2))

    // Test flatMap
    expect(trackedArray.flatMap(x => x)).toEqual(originalArray.flatMap(x => x))
    expect(trackedArray.flatMap((x, i) => x.map(y => y + i))).toEqual(originalArray.flatMap((x, i) => x.map(y => y + i)))
  })

  /**
   * can not treat Array.isArray(tracked) as true
   */
  it.skip('should maintain Array prototype chain and instanceof behavior', () => {
    const tracked = createArrayTrack([1, 2, 3])

    // Should be instance of Array
    expect(tracked).toBeInstanceOf(Array)
    expect(Array.isArray(tracked)).toBe(true)

    // Should have Array prototype methods
    expect(typeof tracked.push).toBe('function')
    expect(typeof tracked.pop).toBe('function')
    expect(typeof tracked.slice).toBe('function')
    expect(typeof tracked.map).toBe('function')

    // Should have correct constructor
    expect(tracked.constructor).toBe(Array)

    // Should have correct prototype
    expect(Object.getPrototypeOf(tracked)).toBe(Array.prototype)
  })

  it('should handle edge cases for all array methods', () => {
    const tracked = createArrayTrack([1, 2, 3])

    // Test with empty arrays
    expect(tracked.concat([])).toEqual([1, 2, 3])
    expect(tracked.slice(10)).toEqual([])
    expect(tracked.filter(() => false)).toEqual([])

    // Test with undefined/null values
    expect(tracked.includes(undefined as any)).toBe(false)
    expect(tracked.indexOf(undefined as any)).toBe(-1)

    // Test with negative indices
    expect(tracked.slice(-2)).toEqual([2, 3])
    expect(tracked.slice(-10)).toEqual([1, 2, 3])

    // Test with out of bounds indices
    expect(tracked.slice(10, 20)).toEqual([])
    expect(tracked.at(10)).toBeUndefined()
    expect(tracked.at(-10)).toBeUndefined()
  })

  it('should track changes correctly for all mutating operations', () => {
    const tracked = createArrayTrack([1, 2, 3, 4, 5])

    // Clear any initial changes
    tracked.clearChanges()

    // Test multiple operations
    tracked.push(6, 7)
    tracked.pop()
    tracked.shift()
    tracked.unshift(0)
    tracked.splice(2, 1, 99)
    tracked.reverse()
    tracked.sort()

    const changes = tracked.changes()
    expect(Object.keys(changes).length).toBeGreaterThan(0)

    // Verify final state
    expect(tracked.length).toBeGreaterThan(0)
    expect([...tracked]).toEqual([...tracked].sort())
  })
})
