import {pipe} from '../'

describe('async-pipe', () => {
  it('should call all async functions', async () => {
    const result = pipe(
      (name: string) => `${name}-foo`,
      (name: string) => `${name}-bar`,
    )
    expect(await result('john')).toBe('john-foo-bar')
  })
  it('should call all async functions returning a array without a last function', async () => {
    const result = pipe(
      (name: string) => [`${name}-foo`, name],
      (name: string, nextName: string) => `${name}-bar-${nextName}`,
    )
    expect(await result('john')).toBe('john-foo-bar-john')
  })
  it('should call all async functions returning a array', async () => {
    const result = pipe(
      (name: string) => [`${name}-foo`, name],
      (name: string, nextName: string) => [`${name}-bar-${nextName}`],
    )
    expect(await result('john')).toEqual(['john-foo-bar-john'])
  })
})
