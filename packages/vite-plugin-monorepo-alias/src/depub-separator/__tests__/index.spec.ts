import {dedupSeparator} from '../'

describe('dedupSeparator', () => {
  it.each([
    //
    ['a/b/c/d', 'a/b/c/d'],
    ['a///b/c/d', 'a/b/c/d'],
    ['a///b//c/d', 'a/b/c/d'],
    ['a///b//c/d///', 'a/b/c/d/'],
    ['///a///b//c/d///', '/a/b/c/d/'],
  ])('should do dedup separating', (path, result) => {
    expect(dedupSeparator(path)).toBe(result)
  })
})
