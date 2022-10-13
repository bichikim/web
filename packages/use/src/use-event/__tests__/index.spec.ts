/**
 * @jest-environment jsdom
 */
import {flushPromises, mount} from '@vue/test-utils'
import {defineComponent, h, ref} from 'vue'
import {useEvent} from '../index'

interface SetupOptions {
  eventName?: string
  immediate?: boolean
  once?: boolean
  target?: any
}

const setup = (options: SetupOptions) => {
  const {immediate, once, target, eventName = 'click'} = options

  const Component = defineComponent({
    props: ['once', 'immediate'],
    setup(props) {
      const elementRef = ref()
      const countRef = ref(0)
      const active = useEvent(
        target ? target : elementRef,
        eventName as any,
        () => {
          countRef.value += 1
        },
        props.immediate,
        {once: props.once},
      )

      return () =>
        h('div', [
          h('div', {id: 'count'}, countRef.value),
          h('button', {id: 'inactive', onClick: () => (active.value = false)}, 'inactive'),
          h('button', {id: 'active', onClick: () => (active.value = true)}, 'active'),
          h('button', {id: 'target', ref: elementRef}, 'target'),
        ])
    },
  })

  const wrapper = mount(Component, {
    props: {
      immediate,
      once,
    },
  })

  return {
    wrapper,
  }
}

describe('use-event', () => {
  it('should trigger event with immediate', async () => {
    const {wrapper} = setup({immediate: true})

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
    const {wrapper} = setup({immediate: true, once: true})
    expect(wrapper.get('#count').text()).toBe('0')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
  })
  it('should trigger with the window target', async () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    const {wrapper} = setup({eventName: 'message', target: window})
    expect(wrapper.get('#count').text()).toBe('0')
    const event = document.createEvent('MessageEvent')
    event.initEvent('message')
    window.dispatchEvent(event)
    await flushPromises()
    expect(wrapper.get('#count').text()).toBe('1')

    wrapper.unmount()
    expect(removeEventListenerSpy).toBeCalledTimes(1)
    removeEventListenerSpy.mockRestore()
  })
  it('should trigger with the window target & false immediate', async () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    const {wrapper} = setup({eventName: 'message', immediate: false, target: window})
    expect(wrapper.get('#count').text()).toBe('0')
    const event = document.createEvent('MessageEvent')
    event.initEvent('message')
    window.dispatchEvent(event)
    expect(wrapper.get('#count').text()).toBe('0')
    await wrapper.get('#active').trigger('click')
    window.dispatchEvent(event)
    await flushPromises()
    expect(wrapper.get('#count').text()).toBe('1')

    wrapper.unmount()
    expect(removeEventListenerSpy.mock.calls.length).toBe(1)
    removeEventListenerSpy.mockRestore()
  })
  it('should work well outside of a component', () => {
    const callback = jest.fn()
    useEvent(window, 'message', callback)

    expect(callback).toHaveBeenCalledTimes(0)

    const event = new Event('message')

    window.dispatchEvent(event)

    expect(callback).toHaveBeenCalledTimes(1)
  })
  it('should init the use-event with null', () => {
    const {wrapper} = setup({
      target: null,
    })
    expect(wrapper.get('#count').text()).toBe('0')
  })
})
