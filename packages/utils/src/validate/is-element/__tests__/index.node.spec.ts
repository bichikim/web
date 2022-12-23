import {isElement} from '../'

describe('is-element (in nodejs)', () => {
  it('should return false with string', () => {
    expect(isElement('foo')).toBe(false)
  })
})
