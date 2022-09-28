import {margeProps} from '../'

describe('marge-props', () => {
  it('should marge props with two object props', () => {
    const foo1 = {default: 7, type: [Number, String]}
    const foo2 = {default: '', type: String}
    const bar = {default: () => ({bar: 'bar'}), type: Object}
    const john = null
    const result = margeProps(
      {
        bar,
        foo: foo1,
      },
      {
        foo: foo2,
        john,
      },
    )
    expect(result).toEqual({
      bar,
      foo: foo1,
      john: null,
    })
  })
  it('should marge props with an object props and an array default props', () => {
    const foo1 = {default: 7, type: [Number, String]}
    const bar = {default: () => ({bar: 'bar'}), type: Object}

    const result = margeProps(
      {
        bar,
        foo: foo1,
      },
      ['foo', 'john'],
    )

    expect(result).toEqual({
      bar,
      foo: foo1,
      john: null,
    })
  })

  it('should marge props with an array props nad an object default props', () => {
    const foo2 = {default: '', type: String}

    const result = margeProps(['foo', 'bar'], {
      foo: foo2,
      john: null,
    })

    expect(result).toEqual({
      bar: null,
      foo: null,
      john: null,
    })
  })
})
