import {describe, expect, it} from 'vitest'

import {filterWithMessage, getSupporterMessage, withMessageField} from '../parse-supporter-message'

describe('withMessageField', () => {
  it('should read the requested field', () => {
    expect(withMessageField('note')({note: 'hello'})).toBe('hello')
  })
})

describe('getSupporterMessage', () => {
  it('should prefer support_note over the legacy message field', () => {
    expect(getSupporterMessage({message: 'legacy', support_note: 'preferred'})).toBe('preferred')
  })

  it('should fall back to the message field', () => {
    expect(getSupporterMessage({message: 'legacy'})).toBe('legacy')
  })
})

describe('filterWithMessage', () => {
  it('should keep only non-empty string messages in input order', () => {
    expect(
      filterWithMessage([
        {support_note: 'first'},
        {message: '   '},
        {message: 'second'},
        {message: 42},
        {},
      ]),
    ).toEqual(['first', 'second'])
  })
})
