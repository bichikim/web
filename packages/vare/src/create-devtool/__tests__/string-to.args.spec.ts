import {stringToArgs} from '../string-to-args'

describe('stringToArgs', () => {
  it('should return args', () => {
    const result = stringToArgs('"foo", 50, "bar"')
    expect(result).toEqual(['foo', 50, 'bar'])
  })
})
