/**
 * @jest-environment jsdom
 */
import {
  defineComponent,
  effectScope,
  flushPromises,
  h,
  mount,
  reactive,
  ref,
  toRef,
} from '@winter-love/vue-test'
import {mutRef} from 'src/refs/mut-ref'
import {onEvent} from '../index'

interface SetupOptions {
  eventName?: string
  isActive?: boolean
  once?: boolean
  target?: any
}

const setup = (options: SetupOptions) => {
  const {isActive, once, target, eventName = 'click'} = options

  const Component = defineComponent({
    props: ['once', 'isActive'],
    setup(props) {
      const elementRef = ref()
      const countRef = ref(0)
      const isActive = mutRef(toRef(props, 'isActive'))
      const once = toRef(props, 'once')
      onEvent(
        target ?? elementRef,
        eventName as any,
        () => {
          countRef.value += 1
        },
        reactive({isActive, once}),
      )

      return () =>
        h('div', [
          h('div', {id: 'count'}, countRef.value),
          h(
            'button',
            {id: 'inactive', onClick: () => (isActive.value = false)},
            'inactive',
          ),
          h('button', {id: 'active', onClick: () => (isActive.value = true)}, 'active'),
          h('button', {id: 'target', ref: elementRef}, 'target'),
        ])
    },
  })

  const wrapper = mount(Component, {
    props: {
      isActive,
      once,
    },
  })

  return {
    wrapper,
  }
}

describe('use-event', () => {
  it('should trigger event with immediate', async () => {
    const {wrapper} = setup({isActive: true})

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
    const {wrapper} = setup({isActive: false})
    expect(wrapper.get('#count').text()).toBe('0')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('0')
    await wrapper.get('#active').trigger('click')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
  })
  it('should not trigger event with the once and the mounted immediate', async () => {
    const {wrapper} = setup({isActive: true, once: true})
    expect(wrapper.get('#count').text()).toBe('0')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
    await wrapper.get('#target').trigger('click')
    expect(wrapper.get('#count').text()).toBe('1')
  })
  it('should trigger with the window target', async () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    const {wrapper} = setup({eventName: 'message', isActive: true, target: window})
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
    const {wrapper} = setup({eventName: 'message', isActive: false, target: window})
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
  it('should work outside of a component', () => {
    const scope = effectScope()
    const callback = jest.fn()
    scope.run(() => {
      onEvent(window, 'message', callback, {isActive: true})

      expect(callback).toHaveBeenCalledTimes(0)

      const event = new Event('message')

      window.dispatchEvent(event)

      expect(callback).toHaveBeenCalledTimes(1)
    })
    scope.stop()
  })
  it('should work without isActive options', () => {
    const scope = effectScope()
    const callback = jest.fn()
    scope.run(() => {
      onEvent(window, 'message', callback)

      expect(callback).toHaveBeenCalledTimes(0)

      const event = new Event('message')

      window.dispatchEvent(event)

      expect(callback).toHaveBeenCalledTimes(1)
    })
    scope.stop()
  })
  it('should initialize the use-event with null', () => {
    const {wrapper} = setup({
      target: null,
    })
    expect(wrapper.get('#count').text()).toBe('0')
  })
})
