import {useImmer} from '../'
import {describe, expect, it} from 'vitest'

describe('useImmer', () => {
  it('should return state and update', async () => {
    const [state, setState] = useImmer({
      name: 'foo',
    })
    expect(state.value).toEqual({name: 'foo'})
    setState((state) => {
      state.name = 'bar'
    })

    expect(state.value).toEqual({name: 'bar'})
  })
})
