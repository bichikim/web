import {reactive, toRefs} from 'vue'

describe('to-refs', () => {
  it('should test ', () => {
    const {foo, bar} = toRefs(reactive({
      bar: 'bar',
      foo: 'foo',
    }))
    expect(foo.value).toBe('foo')
    expect(bar.value).toBe('foo')
  })
})
