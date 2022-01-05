import {toggleRef} from '../'
import {defineComponent, h, ref} from 'vue-demi'
import {mount} from '@vue/test-utils'

const setup = () => {
  const Component = defineComponent({
    setup() {
      const valueRef = ref(false)
      const {toggle, value: clonedValueRef} = toggleRef(valueRef)

      return () => (
        h('div', [
          h('div', {id: 'value'}, valueRef.value),
          h('div', {id: 'clonedValue'}, clonedValueRef.value),
          h('button', {id: 'toggle', onclick: toggle}, 'toggle'),
        ])
      )
    },
  })

  const wrapper = mount(Component)

  return {
    wrapper,
  }
}

const setupNoneRef = () => {
  const Component = defineComponent({
    setup() {
      const {toggle, value: valueRef} = toggleRef(false)

      return () => (
        h('div', [
          h('div', {id: 'value'}, valueRef.value),
          h('button', {id: 'toggle', onclick: toggle}, 'toggle'),
        ])
      )
    },
  })

  const wrapper = mount(Component)

  return {
    wrapper,
  }
}

describe('toggle', () => {
  it('should ', async () => {
    const {wrapper} = setup()

    expect(wrapper.get('#value').text()).toBe('false')
    expect(wrapper.get('#clonedValue').text()).toBe('false')
    await wrapper.get('#toggle').trigger('click')
    expect(wrapper.get('#value').text()).toBe('true')
    expect(wrapper.get('#clonedValue').text()).toBe('true')
  })
})

describe('toggle', () => {
  it('should ', async () => {
    const {wrapper} = setupNoneRef()

    expect(wrapper.get('#value').text()).toBe('false')
    await wrapper.get('#toggle').trigger('click')
    expect(wrapper.get('#value').text()).toBe('true')
  })
})
