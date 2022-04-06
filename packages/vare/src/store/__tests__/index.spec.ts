import {computed, defineComponent, h, ref, toRefs} from 'vue-demi'
import {createManager, createStore, provideStoreManager, useStore} from '../'
import {mount} from '@vue/test-utils'

describe('store', () => {
  it('should create store with root store', async () => {
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
    expect(storeManager.state.value.foo.foo).toBe('foo')
    expect(wrapper.get('#foo').text()).toBe('foo')
    expect(wrapper.get('#foo1').text()).toBe('foo')
    await wrapper.get('#button').trigger('click')
    expect(wrapper.get('#foo').text()).toBe('foo1')
    expect(wrapper.get('#foo1').text()).toBe('foo1')
    expect(storeManager.state.value.foo.foo).toBe('foo1')
  })
  it('should create store with root store with reset', async () => {
    const storeManager = createManager()
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
    })

    const Component = defineComponent({
      setup() {
        const myStore = useMyStore(undefined, {reset: true})
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
        const myStore = useMyStore(undefined, {reset: true})
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
    expect(storeManager.state.value.foo.foo).toBe('foo')
    expect(wrapper.get('#foo').text()).toBe('foo')
    expect(wrapper.get('#foo1').text()).toBe('foo')
    await wrapper.get('#button').trigger('click')
    expect(wrapper.get('#foo').text()).toBe('foo1')
    expect(wrapper.get('#foo1').text()).toBe('foo')
    expect(storeManager.state.value.foo.foo).toBe('foo')
  })
  it('should return state', async () => {
    const storeManager = createManager()
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
    expect(storeManager.state.value.foo.foo).toBe('foo')
    expect(wrapper.get('#foo').text()).toBe('foo')
    await wrapper.get('#button').trigger('click')
    expect(wrapper.get('#foo').text()).toBe('foo1')
  })
  it('should return state with initState', async () => {
    const storeManager = createManager()
    storeManager.setInitState({
      foo: {
        foo: 'foo1',
      },
    })
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
    expect(storeManager.state.value.foo.foo).toBe('foo1')
    expect(wrapper.get('#foo').text()).toBe('foo1')
    await wrapper.get('#button').trigger('click')
    expect(wrapper.get('#foo').text()).toBe('foo11')
  })
  it('should create store that has props', async () => {
    const storeManager = createManager()
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
    const storeManager = createManager()
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

describe('local store', () => {
  it('should create store', async () => {
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
        const myStore = useMyStore.local()
        return () => (
          h('div', [
            h('div', {id: 'foo1'}, myStore.foo),
            h('button', {id: 'button1', onClick: myStore.increase}, 'increase'),
          ])
        )
      },
    })

    const Component2 = defineComponent({
      setup() {
        const myStore = useMyStore()
        return () => (
          h('div', [
            h('div', {id: 'foo2'}, myStore.foo),
            h('button', {id: 'button2', onClick: myStore.increase}, 'increase'),
          ])
        )
      },
    })

    const Component3 = defineComponent({
      setup() {
        const myStore = useMyStore()
        return () => (
          h('div', [
            h('div', {id: 'foo3'}, myStore.foo),
            h('button', {id: 'button3', onClick: myStore.increase}, 'increase'),
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
            h(Component2),
            h(Component3),
          ])
        )
      },
    })

    const wrapper = mount(Root)
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
