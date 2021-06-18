import {sortStyle} from '../sort-style'

describe('sort-style', () => {
  it('should return sorted style', () => {
    const result = sortStyle({
      john: 'john',
      bar: 'foo',
    })

    expect(result).toEqual({
      bar: 'foo',
      john: 'john',
    })
  })
})
