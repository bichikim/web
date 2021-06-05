import {asyncRef} from 'src/async-ref'

describe('asyncRef', () => {
  it('should make function ref', async () => {
    const {error, execute, value, isInProgress} = asyncRef((deco: string) => 'foo' + deco)
    expect(isInProgress.value).toBe(false)
    expect(value.value).toBe(undefined)
    expect(error.value).toBe(undefined)
    const wait = execute('--')
    expect(isInProgress.value).toBe(true)
    await wait
    expect(isInProgress.value).toBe(false)
    expect(value.value).toBe('foo--')
    expect(error.value).toBe(undefined)
  })
  it('should make async function ref', async () => {
    const {error, execute, value, isInProgress} = asyncRef((deco: string) => Promise.resolve('foo' + deco))
    expect(isInProgress.value).toBe(false)
    expect(value.value).toBe(undefined)
    expect(error.value).toBe(undefined)
    const wait = execute('--')
    expect(isInProgress.value).toBe(true)
    await wait
    expect(isInProgress.value).toBe(false)
    expect(value.value).toBe('foo--')
    expect(error.value).toBe(undefined)
  })

  it('should make error function ref', async () => {
    const {error, execute, value, isInProgress} = asyncRef((deco: string) => {
      throw new Error('foo' + deco)
    })
    expect(isInProgress.value).toBe(false)
    expect(value.value).toBe(undefined)
    expect(error.value).toBe(undefined)
    const wait = expect(() => execute('--')).rejects.toEqual(new Error('foo--'))
    // progress ??
    expect(isInProgress.value).toBe(false)
    await wait
    expect(value.value).toBe(undefined)
    expect(error.value).toEqual(new Error('foo--'))
  })
  it('should make async error function ref', async () => {
    const {error, execute, value, isInProgress} = asyncRef((deco: string) => {
      return Promise.reject(new Error('foo' + deco))
    })
    expect(isInProgress.value).toBe(false)
    expect(value.value).toBe(undefined)
    expect(error.value).toBe(undefined)
    const wait = expect(() => execute('--')).rejects.toEqual(new Error('foo--'))
    expect(isInProgress.value).toBe(true)
    await wait
    expect(value.value).toBe(undefined)
    expect(error.value).toEqual(new Error('foo--'))
  })
})
