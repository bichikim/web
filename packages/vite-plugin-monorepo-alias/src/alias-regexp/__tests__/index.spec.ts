import {createAliasRegexp} from '../'

describe('createAliasRegexp', () => {
  it.each([
    //
    ['src', String.raw`/^src\/(.*)$/u`],
  ])('should create alias regexp', (_, regexp) => {
    const aliasRegexp = createAliasRegexp('src')

    expect(aliasRegexp.toString()).toBe(regexp)
  })
})
