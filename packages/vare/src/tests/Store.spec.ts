import {createStore} from '../Store'
import {defineComponent, computed, h} from 'vue'
import {expect} from 'chai'
import {shallowMount} from '@vue/test-utils'

const setup = () => {
  const store = createStore({
    foo: 'foo',
    bar: 'bar',
    john: {
      foo: 'foo',
    },
  })

  const {state, mutation, action} = store

  const setFoo = mutation((value) => {
    state.foo = value
  })

  const setBar = mutation((value) => {
    state.bar = value
  })

  const setJohnFoo = mutation((value) => {
    state.john.foo = value
  })

  const updateThings = action(({foo, bar, john}) => {
    Promise.resolve().then(() => {
      setFoo(foo)
      setBar(bar)
      setJohnFoo(john)
    })
  })

  const Component = defineComponent({
    setup() {
      const foo = computed(() => state.foo)
      const bar = computed(() => state.bar)
      const johnFoo = computed(() => state.john.foo)

      return () => {
        return h('div', () => [
          h('span', {id: 'foo'}, foo.value),
          h('span', {id: 'bar'}, bar.value),
          h('span', {id: 'john-foo'}, johnFoo.value),
        ])
      }
    },
  })

  return {
    state,
    setJohnFoo,
    setFoo,
    setBar,
    updateThings,
    Component,
  }
}

describe('Store', function test() {
  it('should mutate', function test() {
    const {state, setBar, setFoo, setJohnFoo, Component} = setup()
    const wrapper = shallowMount(Component)
    expect(wrapper.find('#foo').exists()).to.equal(true)
    setFoo('_foo')
    expect(state.foo).to.equal('_foo')
    setBar('_bar')
    expect(state.bar).to.equal('_bar')
    setJohnFoo('_foo')
    expect(state.john.foo).to.equal('_foo')
  })
})
