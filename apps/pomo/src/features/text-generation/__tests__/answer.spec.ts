/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {trimRepetitiveTail} from '../answer'

describe('trimRepetitiveTail', () => {
  it('should trim semicolon-separated repeated phrases after three occurrences', () => {
    const phrase = 'same phrase here'
    const answer = `${Array.from({length: 5}, () => phrase).join('; ')};`
    const expected = `${Array.from({length: 3}, () => phrase).join('; ')}.`

    expect(trimRepetitiveTail(answer)).toBe(expected)
  })

  it('should trim full-width semicolon-separated repeated phrases after three occurrences', () => {
    const phrase = 'same phrase here'
    const answer = `${Array.from({length: 5}, () => phrase).join('； ')}；`
    const expected = `${Array.from({length: 3}, () => phrase).join('； ')}.`

    expect(trimRepetitiveTail(answer)).toBe(expected)
  })

  it('should trim semicolon-separated repeated phrases without spaces', () => {
    const phrase = 'same phrase here'
    const answer = `${Array.from({length: 5}, () => phrase).join(';')};`
    const expected = `${Array.from({length: 3}, () => phrase).join(';')}.`

    expect(trimRepetitiveTail(answer)).toBe(expected)
  })

  it('should trim semicolon-separated repeated URL phrases', () => {
    const phrase = 'Check https://example.com/path'
    const answer = `${Array.from({length: 5}, () => phrase).join('; ')};`
    const expected = `${Array.from({length: 3}, () => phrase).join('; ')}.`

    expect(trimRepetitiveTail(answer)).toBe(expected)
  })

  it('should preserve semicolons inside repeated URLs', () => {
    const sentence = 'Check https://example.com/path;param=value now.'
    const answer = Array.from({length: 4}, () => sentence).join(' ')
    const expected = Array.from({length: 3}, () => sentence).join(' ')

    expect(trimRepetitiveTail(answer)).toBe(expected)
  })

  it.each(['\t', '\t\t', '\t \t'])(
    'should trim tab-separated repeated phrases after three occurrences: %j',
    (separator) => {
      const phrase = 'same phrase here'
      const answer = Array.from({length: 5}, () => phrase).join(separator)
      const expected = Array.from({length: 3}, () => phrase).join(separator)

      expect(trimRepetitiveTail(answer)).toBe(expected)
    },
  )

  it('should preserve exactly three tab-separated repetitions', () => {
    const answer = Array.from({length: 3}, () => 'same phrase here').join('\t')

    expect(trimRepetitiveTail(answer)).toBe(answer)
  })

  it('should preserve distinct tab-separated cells and reset the consecutive count', () => {
    const answer = [
      'same phrase here',
      'same phrase here',
      'different cell',
      'same phrase here',
      'same phrase here',
      'same phrase here',
    ].join('\t')

    expect(trimRepetitiveTail(answer)).toBe(answer)
  })

  it('should preserve short tab-separated repeated cells', () => {
    const answer = Array.from({length: 5}, () => 'yes').join('\t')

    expect(trimRepetitiveTail(answer)).toBe(answer)
  })

  it('should count repetitions across mixed tabs and line breaks', () => {
    const phrase = 'same phrase here'
    const answer = `${phrase}\t${phrase}\n${phrase}\t${phrase}\nTrailing text`

    expect(trimRepetitiveTail(answer)).toBe(`${phrase}\t${phrase}\n${phrase}`)
  })
  it.each(['\r', '\r\n', '\n'])(
    'should trim line-break-separated repetitions after three occurrences: %j',
    (separator) => {
      const phrase = 'same phrase here'
      const answer = Array.from({length: 5}, () => phrase).join(separator)

      expect(trimRepetitiveTail(answer)).toBe(Array.from({length: 3}, () => phrase).join(separator))
    },
  )

  it('should trim a fourth CR-separated phrase without replacing retained separators', () => {
    const phrase = 'same phrase here'
    const answer = Array.from({length: 4}, () => phrase).join('\r')

    expect(trimRepetitiveTail(answer)).toBe(Array.from({length: 3}, () => phrase).join('\r'))
  })

  it('should preserve exactly three CR-separated repetitions', () => {
    const answer = Array.from({length: 3}, () => 'same phrase here').join('\r')

    expect(trimRepetitiveTail(answer)).toBe(answer)
  })

  it('should preserve distinct CR-separated phrases and reset the consecutive count', () => {
    const answer = [
      'same phrase here',
      'same phrase here',
      'different phrase',
      'same phrase here',
      'same phrase here',
      'same phrase here',
    ].join('\r')

    expect(trimRepetitiveTail(answer)).toBe(answer)
  })

  it('should preserve short CR-separated repeated phrases', () => {
    const answer = Array.from({length: 5}, () => 'yes').join('\r')

    expect(trimRepetitiveTail(answer)).toBe(answer)
  })

  it('should count repetitions across mixed CR, CRLF, LF, and tab separators', () => {
    const phrase = 'same phrase here'
    const answer = `${phrase}\r${phrase}\r\n${phrase}\t${phrase}\nTrailing text`

    expect(trimRepetitiveTail(answer)).toBe(`${phrase}\r${phrase}\r\n${phrase}`)
  })

  it('should preserve URL semicolons in retained CR-separated phrases', () => {
    const phrase = 'Check https://example.com/path;param=value now'
    const answer = Array.from({length: 5}, () => phrase).join('\r')

    expect(trimRepetitiveTail(answer)).toBe(Array.from({length: 3}, () => phrase).join('\r'))
  })
})
