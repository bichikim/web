import {computed, toRefs} from 'vue-demi'
import {createStore, provideStoreManager, StoreManager, useStore} from '../'
import {defineComponent, h, ref} from 'vue-demi'
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
  it('should create store that has props', async () => {
    const storeManager = new StoreManager()
    const useMyStore = createStore({
      name: 'foo',
      props: {
        name: {default: 'name', type: String},
      },
      setup: (props) => {
        const {name} = toRefs(props)
        const count = ref(0)
        const fooName = computed(() => `foo-${name.value}${count.value}`)

        const increase = () => {
          count.value += 1
        }

        return {
          fooName,
          increase,
          name,
        }
      },
    })

    const Component = defineComponent({
      setup() {
        const name = ref('bar')
        const state = useMyStore({name})
        const onChangeName = () => {
          name.value = 'foo'
        }
        return () => (
          h('div', [
            h('div', {id: 'foo'}, state.name),
            h('div', {id: 'fooName'}, state.fooName),
            h('button', {id: 'button', onClick: state.increase}, 'increase'),
            h('button', {id: 'change', onClick: onChangeName}, 'changeName'),
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
          ])
        )
      },
    })

    const wrapper = mount(Root)
    expect(wrapper.get('#foo').text()).toBe('bar')
    expect(wrapper.get('#fooName').text()).toBe('foo-bar0')
    await wrapper.get('#button').trigger('click')
    expect(wrapper.get('#fooName').text()).toBe('foo-bar1')
    await wrapper.get('#change').trigger('click')
    expect(wrapper.get('#fooName').text()).toBe('foo-foo1')
  })
  it('should create store that can use root', async () => {
    const storeManager = new StoreManager()
    const useBar = createStore({
      name: 'bar',
      setup: () => {
        const name = ref('bar')
        return {
          name,
        }
      },
    })
    const useMyStore = createStore({
      name: 'foo',
      props: {
        name: {default: 'name', type: String},
      },
      setup: (props, {root}) => {
        const barName = computed(() => root.bar?.name)
        const {name} = toRefs(props)
        const count = ref(0)
        const fooName = computed(() => `foo-${name.value}${count.value}`)
        const barNameCount = computed(() => `${barName.value}${count.value}`)

        const increase = () => {
          count.value += 1
        }

        return {
          barNameCount,
          fooName,
          increase,
          name,
        }
      },
    })

    const Outer = defineComponent({
      name: 'Outer',
      setup: (_, {slots}) => {
        useBar()
        return () => (
          h('div', [slots.default?.()])
        )
      },
    })

    const Component = defineComponent({
      setup() {
        const name = ref('bar')

        const state = useMyStore({name})
        const onChangeName = () => {
          name.value = 'foo'
        }
        return () => (
          h('div', [
            h('div', {id: 'foo'}, state.name),
            h('div', {id: 'fooName'}, state.fooName),
            h('div', {id: 'barNameCount'}, state.barNameCount),
            h('button', {id: 'button', onClick: state.increase}, 'increase'),
            h('button', {id: 'change', onClick: onChangeName}, 'changeName'),
          ])
        )
      },
    })

    const Root = defineComponent({
      setup() {
        provideStoreManager(storeManager)
        return () => (
          h('div', [
            h(Outer, () => [
              h(Component),
            ]),
          ])
        )
      },
    })
    //
    const wrapper = mount(Root)
    expect(wrapper.get('#foo').text()).toBe('bar')
    expect(wrapper.get('#fooName').text()).toBe('foo-bar0')
    expect(wrapper.get('#barNameCount').text()).toBe('bar0')
    await wrapper.get('#button').trigger('click')
    expect(wrapper.get('#fooName').text()).toBe('foo-bar1')
    await wrapper.get('#change').trigger('click')
    expect(wrapper.get('#fooName').text()).toBe('foo-foo1')
  })
})
