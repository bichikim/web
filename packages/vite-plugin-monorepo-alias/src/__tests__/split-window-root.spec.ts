import {splitWindowRoot} from '../split-window-root'
import {describe, expect, it} from 'vitest'

describe('split-window-root', () => {
  it('should return path array with window path', () => {
    expect(splitWindowRoot('C:\\Users\\foo\\web\\')).toEqual({
      restPath: '\\Users\\foo\\web\\',
      root: 'C:',
    })
  })
  it('should return path array with path ', () => {
    expect(splitWindowRoot('/users/foo/web/')).toEqual({restPath: '/users/foo/web/'})
  })
})
