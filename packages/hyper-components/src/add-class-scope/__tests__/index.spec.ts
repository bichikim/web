import {addClassScope} from '../'

describe('add-class-scope', () => {
  it('should add scope', () => {
    const result = addClassScope({
      color: 'red',
      padding: '20px',
    }, '.foo')

    expect(result).toEqual({
      '&.foo': {
        color: 'red',
        padding: '20px',
      },
    })
  })
})
