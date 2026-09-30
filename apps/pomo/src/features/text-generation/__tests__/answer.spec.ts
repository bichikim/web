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
})
