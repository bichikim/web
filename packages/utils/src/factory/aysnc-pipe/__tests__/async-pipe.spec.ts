import {asyncPipe} from '../'
import {describe, it, expect} from 'vitest'
describe('async-pipe', () => {
  it('should call all async functions', async () => {
    const result = asyncPipe(
      (name: string) => Promise.resolve(`${name}-foo`),
      (name: string) => Promise.resolve(`${name}-bar`),
    )
    expect(await result('john')).toBe('john-foo-bar')
  })
})
