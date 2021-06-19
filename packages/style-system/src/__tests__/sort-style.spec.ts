import {sortStyle} from '../sort-style'

describe('sort-style', () => {
  it('should return sorted style', () => {
    const result = sortStyle({
      bar: 'foo',
      john: 'john',
    })

    expect(result).toEqual({
      bar: 'foo',
      john: 'john',
    })
  })
})
