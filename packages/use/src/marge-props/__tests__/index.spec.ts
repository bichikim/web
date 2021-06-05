import {margeProps} from '../'

describe('marge-props', () => {
  it('should marge props with two object props', () => {
    const foo1 = {type: [Number, String], default: 7}
    const foo2 = {type: String, default: ''}
    const bar = {type: Object, default: () => ({bar: 'bar'})}
    const john = null
    const result = margeProps(
      {
        foo: foo1,
        bar,
      },
      {
        foo: foo2,
        john,
      },
    )
    expect(result).toEqual({
      foo: foo1,
      bar,
      john: null,
    })
  })
  it('should marge props with an object props and an array default props', () => {
    const foo1 = {type: [Number, String], default: 7}
    const bar = {type: Object, default: () => ({bar: 'bar'})}

    const result = margeProps(
      {
        foo: foo1,
        bar,
      },
      ['foo', 'john'],
    )

    expect(result).toEqual({
      foo: foo1,
      bar,
      john: null,
    })
  })

  it('should marge props with an array props nad an object default props', () => {
    const foo2 = {type: String, default: ''}

    const result = margeProps(
      ['foo', 'bar'],
      {
        foo: foo2,
        john: null,
      },
    )

    expect(result).toEqual({
      foo: null,
      bar: null,
      john: null,
    })
  })
})
