import {createAliasRegexp} from '../alias-regexp'

describe('root-Regexp', () => {
  it('should return alias regex with /', () => {
    const result = createAliasRegexp('/src')

    expect(result.test('src/foo')).toBeTruthy()
    expect(result.test('src/')).toBeTruthy()
  })

  it('should return alias regex with ./', () => {
    const result = createAliasRegexp('./src/foo')

    expect(result.test('src/foo/')).toBeTruthy()
    expect(result.test('src/foo/bar')).toBeTruthy()
  })
})
