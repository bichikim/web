import {createManager} from '../manager'
import {watch, computed} from 'vue-demi'
import {flushPromises} from '@vue/test-utils'

describe('manager', () => {
  it('should update stateTree', async () => {
    const watchFunction = jest.fn()
    const manager = createManager()
    manager.set('foo', {props: {}, store: {name: 'foo'}})
    manager.set('bar', {props: {}, store: {name: 'bar'}})
    watch(manager.storeTree, watchFunction)
    expect(manager.storeTree.foo).toEqual({name: 'foo'})
    expect(manager.storeTree.bar).toEqual({name: 'bar'})
    manager.update({
      bar: {name: 'bar1'},
      foo: {name: 'foo1'},
    })
    await flushPromises()
    expect(watchFunction).toBeCalledTimes(1)
    expect(manager.storeTree.foo).toEqual({name: 'foo1'})
    expect(manager.storeTree.bar).toEqual({name: 'bar1'})
  })
})
