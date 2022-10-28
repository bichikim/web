import {flushPromises} from '@vue/test-utils'
import {usePromise} from '../index'

describe('use promise', () => {
  it('should resolve promise', async () => {
    let resultValue = 'foo'
    const {waiting, count, execute, data, promise, error} = usePromise(() =>
      Promise.resolve(resultValue),
    )

    expect(waiting.value).toBe(false)
    expect(data.value).toBe(undefined)
    expect(count.value).toBe(0)

    execute()

    expect(waiting.value).toBe(true)
    expect(data.value).toBe(undefined)
    expect(error.value).toBe(undefined)
    expect(count.value).toBe(1)

    await promise.value

    expect(waiting.value).toBe(false)
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

  it('should resolve promise with an object', async () => {
    interface Foo {
      age?: number
      name?: string
    }
    const resultValue: Foo = {
      name: 'foo',
    }
    const {execute, data} = usePromise(() => Promise.resolve(resultValue))
    await execute()
    expect(data.value?.name).toBe('foo')
  })

  it('should resolve promise with a promise return from an execute function', async () => {
    const {data, execute, waiting, count} = usePromise(() => Promise.resolve('foo'))

    const wait = execute()

    expect(count.value).toBe(1)
    expect(waiting.value).toBe(true)
    expect(data.value).toBe(undefined)

    await wait

    expect(data.value).toBe('foo')
  })

  it('should resolve a rejection', async () => {
    const {error, execute, waiting, count} = usePromise(() => Promise.reject(new Error('foo')))
    expect(count.value).toBe(0)
    expect(error.value).toBe(undefined)

    const wait = execute()

    expect(waiting.value).toBe(true)
    expect(error.value).toBe(undefined)

    await expect(wait).rejects.toEqual(new Error('foo'))
    expect(error.value).toEqual(new Error('foo'))
    expect(waiting.value).toBe(false)
  })

  it('should resolve promise immediately', async () => {
    const resultValue = 'foo'
    const {waiting, data, promise} = usePromise(() => Promise.resolve(resultValue), undefined, {
      immediate: true,
    })

    expect(waiting.value).toBe(true)
    await promise
    expect(waiting.value).toBe(false)
    expect(data.value).toBe(resultValue)
  })

  it('should resolve promise with context', async () => {
    const {waiting, execute} = usePromise((context) => {
      const {previousCount, previousData, previousError, previousFetching, previousPromise} =
        context
      return Promise.resolve({
        previousCount,
        previousData,
        previousError,
        previousFetching,
        previousPromise,
      })
    })

    expect(waiting.value).toBe(false)

    let result1
    let result2

    execute().then((data) => {
      result1 = data
    })

    expect(waiting.value).toBe(true)

    execute().then((data) => {
      result2 = data
    })

    await flushPromises()

    expect(result1).toEqual({
      previousCount: 0,
      previousData: undefined,
      previousError: undefined,
      previousFetching: false,
      previousPromise: undefined,
    })
    expect(result2).toEqual({
      previousCount: 1,
      previousData: undefined,
      previousError: undefined,
      previousFetching: true,
      previousPromise: Promise.resolve(null),
    })
  })

  it('should resolve promise with args', async () => {
    const {waiting, data, execute} = usePromise((_, name: string, age: number) =>
      Promise.resolve({age, name}),
    )

    await execute('foo', 40)
    expect(waiting.value).toBe(false)
    expect(data.value).toEqual({
      age: 40,
      name: 'foo',
    })
  })

  it('should resolve promise with an arg and the immediate option', async () => {
    const {waiting, data, promise} = usePromise(
      (_, name: string) => Promise.resolve(name),
      ['foo'],
      {immediate: true},
    )

    expect(waiting.value).toBe(true)
    await promise
    expect(waiting.value).toBe(false)
    expect(data.value).toBe('foo')
  })
})