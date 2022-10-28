import {cloneState} from '../clone-state'
import {reactive} from 'vue'

describe('cloneState', () => {
  it('should clone state and do not lose reactive attributes', () => {
    const foo = reactive({
      age: 0,
      increase: () => {
        foo.age += 1
      },
      name: 'foo',
    })
    const result = cloneState(foo)
    expect(result).toEqual({age: 0, name: 'foo'})
    foo.name = 'bar'
    expect(result).toEqual({age: 0, name: 'bar'})
    foo.increase()
    expect(result).toEqual({age: 1, name: 'bar'})
  })
})
