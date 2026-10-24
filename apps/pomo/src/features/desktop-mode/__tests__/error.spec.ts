import {expect, it} from 'vitest'

import {getDesktopErrorMessage} from '../error'

it('should normalize native, structured, and primitive failures', () => {
  expect(getDesktopErrorMessage(new Error('native failed'))).toBe('native failed')
  expect(
    getDesktopErrorMessage({code: 'window-operation-failed', message: 'structured failed'}),
  ).toBe('structured failed')
  expect(getDesktopErrorMessage('primitive failed')).toBe('primitive failed')
  expect(getDesktopErrorMessage(null)).toBe('null')
})
