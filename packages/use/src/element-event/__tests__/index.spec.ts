import {useElementEvent} from '../index'
import {h, defineComponent, ref} from 'vue'
import {mount, flushPromises} from '@vue/test-utils'

const setup = (props: any) => {
  const Component = defineComponent({
    props: ['once', 'immediate'],
    setup(props) {
      const elementRef = ref()
      const countRef = ref(0)
      const {inactive, active} = useElementEvent(elementRef, 'click', () => {
        countRef.value += 1
      }, {once: props.once, immediate: props.immediate})

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

const setupWithWindow = (props: any) => {
  const Component = defineComponent({
    props: ['immediate'],
    setup(props) {
      const countRef = ref(0)
      const {active} = useElementEvent(window, 'message', () => {
        countRef.value += 1
      }, {
        immediate: props.immediate,
      })
      return () => (
        h('div', [
          h('div', {id: 'count'}, countRef.value),
          h('button', {id: 'active', onclick: active}, 'active'),
        ])
      )
    },
  })
  const wrapper = mount(Component, {props})

  return {
    wrapper,
  }
}

describe('element-event', () => {
  it('should trigger event with the mounted immediate', async () => {
    const {wrapper} = setup({immediate: 'mounted'})
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
  it('should not trigger event with the once and the mounted immediate', async () => {
    const {wrapper} = setup({once: true, immediate: 'mounted'})
    expect(wrapper.get('#count').text()).toBe('0')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
  })
  it('should trigger with the window target', async () => {
    const {wrapper} = setupWithWindow({})
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    expect(wrapper.get('#count').text()).toBe('0')
    const event = document.createEvent('MessageEvent')
    event.initEvent('message')
    window.dispatchEvent(event)
    await flushPromises()
    expect(wrapper.get('#count').text()).toBe('1')

    wrapper.unmount()
    expect(removeEventListenerSpy.mock.calls.length).toBe(1)
    removeEventListenerSpy.mockRestore()
  })
  it('should trigger with the window target & false immediate', async () => {
    const {wrapper} = setupWithWindow({immediate: false})
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    expect(wrapper.get('#count').text()).toBe('0')
    const event = document.createEvent('MessageEvent')
    event.initEvent('message')
    window.dispatchEvent(event)
    await flushPromises()
    expect(wrapper.get('#count').text()).toBe('0')
    await wrapper.get('#active').trigger('click')
    window.dispatchEvent(event)
    await flushPromises()
    expect(wrapper.get('#count').text()).toBe('1')

    wrapper.unmount()
    expect(removeEventListenerSpy.mock.calls.length).toBe(1)
    removeEventListenerSpy.mockRestore()
  })
})
