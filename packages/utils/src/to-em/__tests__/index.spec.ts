import {toEm, toRem} from '../'

describe('toEm', () => {
  it('converts a string px or number to an em', () => {
    expect(toEm(16)).toBe('1em')
    expect(toEm(2)).toBe('0.125em')
    expect(toEm('2px')).toBe('0.125em')
  })
})

describe('toRem', () => {
  it('converts a string px or number to a rem', () => {
    expect(toRem(16)).toBe('1rem')
    expect(toRem(2)).toBe('0.125rem')
    expect(toRem('2px')).toBe('0.125rem')
  })
})
