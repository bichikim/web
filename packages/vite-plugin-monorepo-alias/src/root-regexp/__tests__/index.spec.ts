import {createRootRegexp} from '../'

describe('createRootRegexp', () => {
  it.each([
    //
    ['/User', '/', '/^\\/User/u'],
    ['\\Users\\foo\\web\\', '\\', '/^\\/Users\\/foo\\/web/u'],
  ])('should create root regexp', (root, delimiter, regexp) => {
    const rootRegexp = createRootRegexp(root, delimiter)

    expect(rootRegexp.toString()).toBe(regexp)
  })
})
