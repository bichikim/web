import {flushPromises} from '@vue/test-utils'
import {reactive, watch} from 'vue'
import {createManager} from 'src/store/manager'

describe('manager', () => {
  it('should update stateTree', async () => {
    const watchFunction = jest.fn()
    const manager = createManager()
    const foo = reactive({
      inc: () => null,
      name: 'foo',
    })
    const bar = reactive({
      name: 'bar',
    })
    manager.set('foo', {state: foo})
    manager.set('bar', {state: bar})
    watch(manager.state, watchFunction, {deep: true})
    expect(manager.state.value.foo).toEqual({name: 'foo'})
    expect(manager.state.value.bar).toEqual({name: 'bar'})
    foo.name = 'foo1'
    bar.name = 'bar1'
    await flushPromises()
    expect(watchFunction).toBeCalledTimes(1)
    expect(manager.state.value.foo).toEqual({name: 'foo1'})
    expect(manager.state.value.bar).toEqual({name: 'bar1'})
  })
})
