import {mergeStyle} from '../marge-style'

describe('merge', () => {
  it('should merge', () => {
    const result = mergeStyle({
      foo: {
        bar: '',
        foo: {
          bar: '',
        },
      },

    }, {
      foo: {
        john: '',
        foo: {
          john: '',
        },
      },
    })
    expect(result).toEqual({
      foo: {
        bar: '',
        john: '',
        foo: {
          john: '',
        },
      },
    })
  })

})
