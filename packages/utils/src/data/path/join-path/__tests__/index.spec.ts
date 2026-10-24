import {joinPath} from '../'
import {describe, expect, it} from 'vitest'

describe('join-path', () => {
  it.each([
    //
    [['a', 'b'], 'a/b'],
    [['a', '/b'], 'a/b'],
    [['/a', '/b'], 'a/b'],
    [['/a//', '//b'], 'a/b'],
    [['/a//c', '//b'], 'a/c/b'],
    [['/', '/'], ''],
  ])('should join path', (paths, result) => {
    expect(joinPath(...paths)).toBe(result)
  })
})
