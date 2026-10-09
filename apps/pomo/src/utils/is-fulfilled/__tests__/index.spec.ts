/** @vitest-environment node */
import {expect, it} from 'vitest'
import {isFulfilled} from '..'

it.each([undefined, null, false, 0, '', 'done'])(
  'should return true when the promise fulfills with %s',
  (value) => {
    return expect(isFulfilled(Promise.resolve(value))).resolves.toBe(true)
  },
)

it.each([new Error('denied'), 'denied', undefined])(
  'should return false when the promise rejects with %s',
  (reason) => {
    return expect(isFulfilled(Promise.reject(reason))).resolves.toBe(false)
  },
)
