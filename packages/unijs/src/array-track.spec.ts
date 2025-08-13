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
})
