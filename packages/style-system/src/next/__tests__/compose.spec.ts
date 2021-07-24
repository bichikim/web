import {compose} from '../compose'
import {system} from '../system'

const style1 = system({
  bar: {
    property: 'left',
  },
  foo: true,
  john: {
    transform: ({value}) => {
      return {
        top: value,
      }
    },
  },
})

const style2 = system({
  bar: {
    property: 'right',
  },
  john: {
    transform: ({value}) => {
      return {
        top: value,
      }
    },
  },
  yeah: {
    properties: ['width', 'height'],
  },
})

describe('compost', () => {
  it('should compose systems', () => {
    const styleFunction = compose(style1, style2)

    expect(styleFunction({
      bar: ['100px', '200px'],
      foo: 'foo',
      john: '200px',
      theme: {
        breakpoints: ['500px', '700px'],
      },
      yeah: '300px',
    })).toEqual({
      '@media screen and (min-width: 500px)': {
        left: '200px', right: '200px',
      },
      foo: 'foo',
      height: '300px',
      left: '100px',
      right: '100px',
      top: '200px',
      width: '300px',
    })
  })
})
