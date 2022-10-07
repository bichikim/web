import {useImmer} from '../'

describe('useImmer', () => {
  it('should return state and update', () => {
    const [state, setState] = useImmer('foo')
  })
})
