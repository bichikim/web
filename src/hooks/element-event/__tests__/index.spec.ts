import {useElementEvent} from '../index'
import {defineComponent, h, ref} from 'vue'
import {flushPromises, mount} from '@vue/test-utils'

const setup = (props: any) => {
  const Component = defineComponent({
    props: ['once', 'immediate'],
    setup(props) {
      const elementRef = ref()
      const countRef = ref(0)
      const {inactive, active} = useElementEvent(elementRef, 'click', () => {
        countRef.value += 1
      }, {immediate: props.immediate, once: props.once})
      return () => (
        h('div', [
          h('div', {id: 'count'}, countRef.value),
          h('button', {id: 'inactive', onclick: inactive}, 'inactive'),
          h('button', {id: 'active', onclick: active}, 'active'),
          h('button', {id: 'target', ref: elementRef}, 'target'),
        ])
      )
    },
  })

  const wrapper = mount(Component, {
    props,
  })

  return {
    wrapper,
  }
}

const setupWithWindow = (callback: any) => {
  const Component = defineComponent({
    setup() {
      const countRef = ref(0)
      useElementEvent(window, 'message', () => {
        console.log('foo')
        countRef.value += 1
        callback()
      })
      return () => (
        h('div', [
          h('div', {id: 'count'}, countRef.value),
        ])
      )
    },
  })
  const wrapper = mount(Component)

  return {
    wrapper,
  }
}

describe('element-event', () => {
  it('should trigger event', async () => {
    const {wrapper} = setup({})
    expect(wrapper.get('#count').text()).toBe('0')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('2')
    await wrapper.get('#inactive').trigger('click')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('2')
    await wrapper.get('#active').trigger('click')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('3')
  })
  it('should not trigger event with the immediate false', async () => {
    const {wrapper} = setup({immediate: false})
    expect(wrapper.get('#count').text()).toBe('0')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('0')
    await wrapper.get('#active').trigger('click')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
  })
  it('should not trigger event with the once', async () => {
    const {wrapper} = setup({once: true})
    expect(wrapper.get('#count').text()).toBe('0')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
  })
  it('should trigger with the window target', async () => {
    const callback = jest.fn()
    const {wrapper} = setupWithWindow(callback)
    expect(wrapper.get('#count').text()).toBe('0')
    const event = document.createEvent('MessageEvent')
    event.initEvent('message')
    window.dispatchEvent(event)
    await flushPromises()
    expect(wrapper.get('#count').text()).toBe('1')
    expect(callback.mock.calls.length).toBe(1)

    wrapper.unmount()
    window.dispatchEvent(event)
    await flushPromises()
    expect(callback.mock.calls.length).toBe(1)
  })
})
