import {splitWindowRoot} from '../'
import {describe, expect, it} from 'vitest'

describe('splitWindowRoot', () => {
  it.each([
    //
    ['C:\\Users\\foo\\web\\', {restPath: '\\Users\\foo\\web\\', root: 'C:'}],
    ['/users/foo/web/', {restPath: '/users/foo/web/'}],
  ])('should return path info with window path', (path, result) => {
    expect(splitWindowRoot(path)).toEqual(result)
  })
})
