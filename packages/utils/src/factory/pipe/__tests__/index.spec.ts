import {pipe} from '../'

describe('pipe', () => {
  it('should call all functions', async () => {
    const result = pipe(
      (name: string) => `${name}-foo`,
      (name: string) => `${name}-bar`,
    )
    expect(await result('john')).toBe('john-foo-bar')
  })
})
