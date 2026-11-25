import {describe, expect, it} from 'vitest'

import {filterWithMessage, getSupporterMessage, withMessageField} from '..'

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

describe('empty support_note fallback', () => {
  it.each(['', null, undefined])('should use message when support_note is %j', (support_note) => {
    expect(getSupporterMessage({message: '  legacy  ', support_note})).toBe('  legacy  ')
    expect(filterWithMessage([{message: '  legacy  ', support_note}])).toEqual(['  legacy  '])
  })

  it('should preserve whitespace-only support_note filtering and preferred text verbatim', () => {
    expect(getSupporterMessage({message: 'legacy', support_note: ' \t\n '})).toBe(' \t\n ')
    expect(
      filterWithMessage([
        {message: 'legacy', support_note: ' \t\n '},
        {message: 'legacy', support_note: '  preferred  '},
        {message: '', support_note: ''},
        {message: null, support_note: ''},
        {message: 42, support_note: ''},
        {},
      ]),
    ).toEqual(['  preferred  '])
  })
})
