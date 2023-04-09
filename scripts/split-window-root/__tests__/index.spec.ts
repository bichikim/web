import {splitWindowRoot} from '../'

describe('split-window-root', () => {
  it('should return path array with window path', () => {
    expect(splitWindowRoot('C:\\Users\\foo\\web\\')).toEqual(['C:', '\\Users\\foo\\web\\'])
  })
  it('should return path array with path ', () => {
    expect(splitWindowRoot('/users/foo/web/')).toEqual([undefined, '/users/foo/web/'])
  })
})
