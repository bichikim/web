import {usePromise} from '../index'

describe('promise-ref', () => {
  it('should resolve data', async () => {
    let resultValue = 'foo'
    const {
      fetching, count, execute, data, promise, error,
    } = usePromise(() => Promise.resolve(resultValue))

    expect(fetching.value).toBe(false)
    expect(data.value).toBe(undefined)
    expect(count.value).toBe(0)

    execute()

    expect(fetching.value).toBe(true)
    expect(data.value).toBe(undefined)
    expect(error.value).toBe(undefined)
    expect(count.value).toBe(1)

    await promise.value

    expect(fetching.value).toBe(false)
    expect(data.value).toBe('foo')
    expect(error.value).toBe(undefined)

    resultValue = 'bar'

    execute()

    expect(count.value).toBe(2)
    expect(data.value).toBe(undefined)
    expect(error.value).toBe(undefined)

    await promise.value

    expect(count.value).toBe(2)
    expect(data.value).toBe('bar')
    expect(error.value).toBe(undefined)
  })

  it('should resolve with execute promise return', async () => {
    const {
      data, execute, fetching, count,
    } = usePromise(() => Promise.resolve('foo'))

    const wait = execute()

    expect(count.value).toBe(1)
    expect(fetching.value).toBe(true)
    expect(data.value).toBe(undefined)

    await wait

    expect(data.value).toBe('foo')
  })

  it('should resolve a rejection', async () => {
    const {
      error, execute, fetching, count,
    } = usePromise(() => Promise.reject(new Error('foo')))
    expect(count.value).toBe(0)
    expect(error.value).toBe(undefined)

    const wait = execute()

    expect(fetching.value).toBe(true)
    expect(error.value).toBe(undefined)

    await expect(wait).rejects.toEqual(new Error('foo'))
    expect(error.value).toEqual(new Error('foo'))
    expect(fetching.value).toBe(false)
  })

  it('should resolve immediate', async () => {
    const resultValue = 'foo'
    const {
      fetching, data, promise,
    } = usePromise(() => Promise.resolve(resultValue), {immediate: []})

    expect(fetching.value).toBe(true)
    await promise
    expect(fetching.value).toBe(false)
    expect(data.value).toBe(resultValue)
  })
})
