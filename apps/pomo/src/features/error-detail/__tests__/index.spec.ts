import {expect, it} from 'vitest'
import {getExceptionMessage} from '..'

it('should preserve Error messages including empty and whitespace messages', () => {
  expect(getExceptionMessage(new Error('detail'), 'fallback')).toBe('detail')
  expect(getExceptionMessage(new Error(''), 'fallback')).toBe('')
  expect(getExceptionMessage(new Error(' '), 'fallback')).toBe(' ')
})

it('should use the fallback for values outside the Error contract', () => {
  expect(getExceptionMessage({message: 'detail'}, 'fallback')).toBe('fallback')
  expect(getExceptionMessage('detail', 'fallback')).toBe('fallback')
  expect(getExceptionMessage(null, 'fallback')).toBe('fallback')
})

it('should retain subclass messages and propagate exceptional message access', () => {
  expect(getExceptionMessage(new TypeError('detail'), 'fallback')).toBe('detail')
  const failure = new Error('getter failed')
  const error = new Error()
  Object.defineProperty(error, 'message', {
    get() {
      throw failure
    },
  })
  expect(() => getExceptionMessage(error, 'fallback')).toThrow(failure)
})

it('should evaluate a fallback only when the value is not an Error', () => {
  const failure = new Error('conversion failed')
  const fallback = () => {
    throw failure
  }
  expect(getExceptionMessage(new Error(''), fallback)).toBe('')
  expect(() => getExceptionMessage({}, fallback)).toThrow(failure)
  expect(getExceptionMessage({message: 'ignored'}, () => 'converted')).toBe('converted')
})
