import {joinPath} from '../'
import {describe, it, expect} from 'vitest'

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
