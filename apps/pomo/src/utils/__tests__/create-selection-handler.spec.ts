import {describe, expect, it, vi} from 'vitest'
import {createSelectionHandler} from '../create-selection-handler'

describe('createSelectionHandler', () => {
  it('should deliver valid choices and ignore unknown values', () => {
    const onChange = vi.fn<(value: 'ko' | 'en') => void>()
    const select = createSelectionHandler(['ko', 'en'] as const, onChange)
    select('ko')
    select('invalid')
    select('en')
    expect(onChange.mock.calls).toEqual([['ko'], ['en']])
  })
  it('should ignore all input when choices are empty', () => {
    const onChange = vi.fn()
    createSelectionHandler([], onChange)('constructor')
    expect(onChange).not.toHaveBeenCalled()
  })
  it('should accept empty and prototype-named choices without accepting inherited properties', () => {
    const onChange = vi.fn()
    const select = createSelectionHandler(['', '__proto__', 'constructor', 'constructor'], onChange)
    select('')
    select('__proto__')
    select('constructor')
    select('toString')
    expect(onChange.mock.calls).toEqual([[''], ['__proto__'], ['constructor']])
  })
})
