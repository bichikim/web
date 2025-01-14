import {createRootRegexp} from '../'
import {describe, expect, it} from 'vitest'

describe('createRootRegexp', () => {
  it.each([
    //
    ['/User', '/', String.raw`/^\/User/u`],
    ['\\Users\\foo\\web\\', '\\', String.raw`/^\/Users\/foo\/web/u`],
  ])('should create root regexp', (root, delimiter, regexp) => {
    const rootRegexp = createRootRegexp(root, delimiter)

    expect(rootRegexp.toString()).toBe(regexp)
  })
})
