import {createAliasRegexp} from '../'

describe('createAliasRegexp', () => {
  it.each([
    //
    ['src', '/^src\\/(.*)$/u'],
  ])('should create alias regexp', (alias, regexp) => {
    const aliasRegexp = createAliasRegexp('src')

    expect(aliasRegexp.toString()).toBe(regexp)
  })
})
