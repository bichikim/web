import {asyncPipe} from '../'

describe('async-pipe', () => {
  it('should call all async functions', async () => {
    const result = asyncPipe(
      (name: string) => Promise.resolve(`${name}-foo`),
      (name: string) => Promise.resolve(`${name}-bar`),
    )
    expect(await result('john')).toBe('john-foo-bar')
  })
  it('should call all async functions returning a array', async () => {
    const result = asyncPipe(
      (name: string) => Promise.resolve([`${name}-foo`, name]),
      (name: string, nextName: string) => Promise.resolve(`${name}-bar-${nextName}`),
    )
    expect(await result('john')).toBe('john-foo-bar-john')
  })
  it('should call part of async functions returning a array', async () => {
    const result = asyncPipe(
      (name: string) => Promise.resolve([`${name}-foo`, name]),
      (name: string, nextName: string) => `${name}-bar-${nextName}`,
    )
    expect(await result('john')).toBe('john-foo-bar-john')
  })
  it('should call all functions returning a array', async () => {
    const result = asyncPipe(
      (name: string) => [`${name}-foo`, name],
      (name: string, nextName: string) => `${name}-bar-${nextName}`,
    )
    expect(await result('john')).toBe('john-foo-bar-john')
  })
})
