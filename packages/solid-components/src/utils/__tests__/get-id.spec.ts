import {expect, it} from 'vitest'
import {getId} from '..'

it('should join identifier parts with the namespace prefix', () => {
  expect(getId('dialog', 'title')).toBe('coong:dialog-title')
})
