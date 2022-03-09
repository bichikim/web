import {createStore, provideStoreManager, StoreManager, useStore} from '../'
import {defineComponent, h, ref} from 'vue'
import {mount} from '@vue/test-utils'

describe('store', () => {
  it('should create store with root store', async () => {
    const storeManager = new StoreManager()
    const useMyStore = createStore('foo', () => {

      const foo = ref('foo')

      const increase = () => {
        foo.value += 1
      }

      return {
        foo,
        increase,
      }
    })

    const Component = defineComponent({
      setup() {
        const myStore = useMyStore()
        return () => (
          h('div', [
            h('div', {id: 'foo'}, myStore.foo),
            h('button', {id: 'button', onClick: myStore.increase}, 'increase'),
          ])
        )
      },
    })

    const Component1 = defineComponent({
      setup() {
        const myStore = useMyStore()
        return () => (
          h('div', [
            h('div', {id: 'foo1'}, myStore.foo),
            h('button', {id: 'button1', onClick: myStore.increase}, 'increase'),
          ])
        )
      },
    })

    const Root = defineComponent({
      setup() {
        provideStoreManager(storeManager)
        return () => (
          h('div', [
            h(Component),
            h(Component1),
          ])
        )
      },
    })

    const wrapper = mount(Root)
    expect(storeManager.storeTree.foo.foo).toBe('foo')
    expect(wrapper.get('#foo').text()).toBe('foo')
    expect(wrapper.get('#foo1').text()).toBe('foo')
    await wrapper.get('#button').trigger('click')
    expect(wrapper.get('#foo').text()).toBe('foo1')
    expect(wrapper.get('#foo1').text()).toBe('foo1')
    expect(storeManager.storeTree.foo.foo).toBe('foo1')
  })
  it('should create store with root store with useWithReset', async () => {
    const storeManager = new StoreManager()
    const useMyStore = createStore({
      name: 'foo',
      setup: () => {

        const foo = ref('foo')

        const increase = () => {
          foo.value += 1
        }

        return {
          foo,
          increase,
        }
      },
      useWithReset: true,
    })

    const Component = defineComponent({
      setup() {
        const myStore = useMyStore()
        return () => (
          h('div', [
            h('div', {id: 'foo'}, myStore.foo),
            h('button', {id: 'button', onClick: myStore.increase}, 'increase'),
          ])
        )
      },
    })

    const Component1 = defineComponent({
      setup() {
        const myStore = useMyStore()
        return () => (
          h('div', [
            h('div', {id: 'foo1'}, myStore.foo),
            h('button', {id: 'button1', onClick: myStore.increase}, 'increase'),
          ])
        )
      },
    })

    const Root = defineComponent({
      setup() {
        provideStoreManager(storeManager)
        return () => (
          h('div', [
            h(Component),
            h(Component1),
          ])
        )
      },
    })

    const wrapper = mount(Root)
    expect(storeManager.storeTree.foo.foo).toBe('foo')
    expect(wrapper.get('#foo').text()).toBe('foo')
    expect(wrapper.get('#foo1').text()).toBe('foo')
    await wrapper.get('#button').trigger('click')
    expect(wrapper.get('#foo').text()).toBe('foo1')
    expect(wrapper.get('#foo1').text()).toBe('foo')
    expect(storeManager.storeTree.foo.foo).toBe('foo')
  })
  it('should return state', async () => {
    const storeManager = new StoreManager()
    const Component = defineComponent({
      setup() {
        const state = useStore('foo', () => {
          const foo = ref('foo')
          const increase = () => {
            foo.value += 1
          }
          return {
            foo,
            increase,
          }
        })
        return () => (
          h('div', [
            h('div', {id: 'foo'}, state.foo),
            h('button', {id: 'button', onClick: state.increase}, 'increase'),
          ])
        )
      },
    })

    const Root = defineComponent({
      setup() {
        provideStoreManager(storeManager)
        return () => (
          h(Component)
        )
      },
    })

    const wrapper = mount(Root)
    expect(storeManager.storeTree.foo.foo).toBe('foo')
    expect(wrapper.get('#foo').text()).toBe('foo')
    await wrapper.get('#button').trigger('click')
    expect(wrapper.get('#foo').text()).toBe('foo1')
  })
})
