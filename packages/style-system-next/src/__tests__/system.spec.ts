import {system} from '../system'

const theme = {
  breakpoints: ['500px', '750px', '1200px'],
  foos: {
    foo: '300px',
  },
}

describe('system', () => {
  it('should return style without theme', () => {
    const styleFunction = system({
      foo: {
        defaultScale: {
          foo: '200px',
        },
        property: 'left',
        scale: 'foos',
      },
    })

    expect(styleFunction({foo: 'foo'})).toEqual({
      left: '200px',
    })
  })
  it('should return style without theme', () => {
    const styleFunction = system({
      foo: {
        defaultScale: {
          bar: '400px',
          foo: '200px',
        },
        property: 'left',
        scale: 'foos',
      },
    })

    expect(styleFunction({foo: ['foo', 'bar'], right: '500px', theme})).toEqual({
      '@media screen and (min-width: 500px)': {
        left: '400px',
      },
      left: '300px',
      right: '500px',
    })
  })
  it('should return size style with auto number to string size', () => {
    const styleFunction = system({
      foo: {
        defaultScale: {
          bar: '400px',
          foo: '200px',
        },
        property: 'left',
        scale: 'foos',
      },
    })

    expect(styleFunction({foo: ['foo', 'bar'], right: '500px', theme})).toEqual({
      '@media screen and (min-width: 500px)': {
        left: '400px',
      },
      left: '300px',
      right: '500px',
    })
  })
})
