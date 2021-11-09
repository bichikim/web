import {findState} from 'src/create-devtool/find-state'
import {atom} from 'src/atom'
import {state} from 'src/state'

describe('find-state', () => {
  it('should return atoms', () => {
    const result = findState(atom({
      foo: atom({
        bar: 'bar',
        john: atom({
          name: 'john',
        }),
      }),
    }))

    expect(result).toMatchSnapshot()
  })
  it('should return state', () => {
    const result = findState(state({
      bar: 'bar',
      foo: state({
        deep: 'deep-foo',
      }),
    }))

    expect(result).toMatchSnapshot()
  })
})
