import {mount} from '@vue/test-utils'
import {defineComponent, h, ref} from 'vue'
import {createManager, createStore, provideStoreManager} from '../'

describe('local store', () => {
  it.skip('should create store', async () => {
    const storeManager = createManager()

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
        const myStore = useMyStore.local()
        return () =>
          h('div', [
            h('div', {id: 'foo'}, myStore.foo),
            h('button', {id: 'button', onClick: myStore.increase}, 'increase'),
          ])
      },
    })

    const Component1 = defineComponent({
      setup() {
        const myStore = useMyStore.local()
        return () =>
          h('div', [
            h('div', {id: 'foo1'}, myStore.foo),
            h('button', {id: 'button1', onClick: myStore.increase}, 'increase'),
          ])
      },
    })

    const Component2 = defineComponent({
      setup() {
        const myStore = useMyStore()
        return () =>
          h('div', [
            h('div', {id: 'foo2'}, myStore.foo),
            h('button', {id: 'button2', onClick: myStore.increase}, 'increase'),
          ])
      },
    })

    const Component3 = defineComponent({
      setup() {
        const myStore = useMyStore()
        return () =>
          h('div', [
            h('div', {id: 'foo3'}, myStore.foo),
            h('button', {id: 'button3', onClick: myStore.increase}, 'increase'),
          ])
      },
    })

    const Root = defineComponent({
      setup() {
        provideStoreManager(storeManager)
        return () => h('div', [h(Component), h(Component1), h(Component2), h(Component3)])
      },
    })

    const wrapper = mount(Root)
    console.log(storeManager.state.value)
    expect(storeManager.state.value.foo.foo).toBe('foo')
    expect(wrapper.get('#foo').text()).toBe('foo')
    expect(wrapper.get('#foo1').text()).toBe('foo')
    expect(wrapper.get('#foo2').text()).toBe('foo')
    expect(wrapper.get('#foo3').text()).toBe('foo')
    await wrapper.get('#button').trigger('click')
    expect(wrapper.get('#foo').text()).toBe('foo1')
    expect(wrapper.get('#foo1').text()).toBe('foo')
    expect(wrapper.get('#foo2').text()).toBe('foo')
    expect(wrapper.get('#foo3').text()).toBe('foo')
    expect(storeManager.state.value.foo.foo).toBe('foo')
    await wrapper.get('#button1').trigger('click')
    expect(wrapper.get('#foo').text()).toBe('foo1')
    expect(wrapper.get('#foo1').text()).toBe('foo1')
    expect(wrapper.get('#foo2').text()).toBe('foo')
    expect(wrapper.get('#foo3').text()).toBe('foo')
    expect(storeManager.state.value.foo.foo).toBe('foo')
    await wrapper.get('#button2').trigger('click')
    expect(wrapper.get('#foo').text()).toBe('foo1')
    expect(wrapper.get('#foo1').text()).toBe('foo1')
    expect(wrapper.get('#foo2').text()).toBe('foo1')
    expect(wrapper.get('#foo3').text()).toBe('foo1')
    expect(storeManager.state.value.foo.foo).toBe('foo1')
  })
})
