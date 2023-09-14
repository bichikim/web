import {splitWindowRoot} from '../split-window-root'

describe('split-window-root', () => {
  it('should return path array with window path', () => {
    expect(splitWindowRoot('C:\\Users\\foo\\web\\')).toBe('\\Users\\foo\\web\\')
  })
  it('should return path array with path ', () => {
    expect(splitWindowRoot('/users/foo/web/')).toBe('/users/foo/web/')
  })
})
