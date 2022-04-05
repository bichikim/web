import {flushPromises} from '@vue/test-utils'
import {watch} from 'vue-demi'
import {createManager} from 'src/store/manager'

describe('manager', () => {
  it('should update stateTree', async () => {
    const watchFunction = jest.fn()
    const manager = createManager()
    manager.set('foo', {props: {}, store: {name: 'foo'}})
    manager.set('bar', {props: {}, store: {name: 'bar'}})
    watch(manager.state.value, watchFunction)
    expect(manager.state.value.foo).toEqual({name: 'foo'})
    expect(manager.state.value.bar).toEqual({name: 'bar'})
    manager.update({
      bar: {name: 'bar1'},
      foo: {name: 'foo1'},
    })
    await flushPromises()
    expect(watchFunction).toBeCalledTimes(1)
    expect(manager.state.value.foo).toEqual({name: 'foo1'})
    expect(manager.state.value.bar).toEqual({name: 'bar1'})
  })
})
