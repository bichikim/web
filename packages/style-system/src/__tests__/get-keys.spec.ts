import {getKeys} from '../get-keys'

describe('getKeys', () => {
  it('should ', () => {
    const result = getKeys({
      foo: 'foo',
      bar: 'bar',
      config: 'config',
    })

    expect(result).toEqual(['foo', 'bar'])
  })
})
