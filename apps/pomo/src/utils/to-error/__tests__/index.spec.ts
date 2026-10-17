/** @vitest-environment node */
import {runInNewContext} from 'node:vm'
import {expect, it} from 'vitest'
import {toError} from '..'

it.each([new Error(''), new TypeError('detail'), new AggregateError([], 'aggregate')])(
  'should preserve an existing $name instance and its original descriptors',
  (error) => {
    const descriptors = Object.getOwnPropertyDescriptors(error)

    expect(toError(error, 'fallback')).toBe(error)
    expect(Object.getOwnPropertyDescriptors(error)).toEqual(descriptors)
  },
)

it('should return an Error without reading its message or cause getters', () => {
  const error = new Error()
  Object.defineProperties(error, {
    cause: {
      get: () => {
        throw new Error('cause must remain unread')
      },
    },
    message: {
      get: () => {
        throw new Error('message must remain unread')
      },
    },
  })

  expect(toError(error, 'fallback')).toBe(error)
})

it.each([undefined, null, false, 0, '', 'failure', Symbol('failure')])(
  'should retain %s as an own non-enumerable cause and use the supplied fallback',
  (cause) => {
    const error = toError(cause, 'fallback')

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('fallback')
    expect(Object.getOwnPropertyDescriptor(error, 'cause')).toEqual({
      configurable: true,
      enumerable: false,
      value: cause,
      writable: true,
    })
  },
)

it('should wrap a foreign-realm Error rather than treating it as a local Error', () => {
  const foreign: unknown = runInNewContext("new Error('foreign detail')")
  const error = toError(foreign, 'local fallback')

  expect(error).not.toBe(foreign)
  expect(error.message).toBe('local fallback')
  expect(error.cause).toBe(foreign)
})

it('should keep an empty fallback and create a distinct wrapper for each conversion', () => {
  const cause = {message: 'a record is not an Error'}
  const first = toError(cause, '')
  const second = toError(cause, '')

  expect(first.message).toBe('')
  expect(first.cause).toBe(cause)
  expect(second).not.toBe(first)
  expect(second.cause).toBe(cause)
})

it('should not inspect message fields on non-Error values', () => {
  const cause = Object.defineProperty({}, 'message', {
    get: () => {
      throw new Error('record message must remain unread')
    },
  })
  const error = toError(cause, 'record fallback')

  expect(error.message).toBe('record fallback')
  expect(error.cause).toBe(cause)
})

it('should preserve a prototype lookup failure without converting it to a different Error', () => {
  const failure = new Error('prototype lookup failed')
  const cause = new Proxy(
    {},
    {
      getPrototypeOf: () => {
        throw failure
      },
    },
  )

  let caught: unknown
  try {
    toError(cause, 'fallback')
  } catch (error: unknown) {
    caught = error
  }
  expect(caught).toBe(failure)
})
