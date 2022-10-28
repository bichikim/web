import {pipe} from '../'

describe('pipe', () => {
  it('should call all functions', async () => {
    const result = pipe(
      (name: string) => `${name}-foo`,
      (name: string) => `${name}-bar`,
    )
    expect(await result('john')).toBe('john-foo-bar')
  })
  it('should call all functions returning a array without a last function', async () => {
    const result = pipe(
      (name: string) => [`${name}-foo`, name],
      (name: string, nextName: string) => `${name}-bar-${nextName}`,
    )
    expect(await result('john')).toBe('john-foo-bar-john')
  })
  it('should call all functions returning a array', async () => {
    const result = pipe(
      (name: string) => [`${name}-foo`, name],
      (name: string, nextName: string) => [`${name}-bar-${nextName}`],
    )
    expect(await result('john')).toEqual(['john-foo-bar-john'])
  })
})
