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
        foo: {
          john: '',
        },
        john: '',
      },
    })
    expect(result).toEqual({
      foo: {
        bar: '',
        foo: {
          john: '',
        },
        john: '',
      },
    })
  })

})
