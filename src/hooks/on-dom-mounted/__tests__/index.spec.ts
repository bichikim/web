import {flushPromises, mount} from '@vue/test-utils'
import {defineComponent, h, ref} from 'vue'
import {onDomMounted} from '../index'

const setup = () => {
  const Component = defineComponent({
    setup: () => {
      const domMounted = ref(0)

      onDomMounted(() => {
        domMounted.value += 1
      })

      return () => (
        h('div', domMounted.value)
      )
    },
  })

  const wrapper = mount(Component)

  return {
    wrapper,
  }
}

describe('onDomMounted', () => {
  it('should wait calling the hook after the Dom loaded', async () => {
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'interactive',
    })

    let _handler: () => any = () => null

    const addEventListener = jest.spyOn(window, 'addEventListener').mockImplementationOnce((event, handler) => {
      _handler = handler as any
    })

    const removeEventListener = jest.spyOn(window, 'removeEventListener')

    const {wrapper} = setup()

    expect(wrapper.text()).toBe('0')

    expect(typeof _handler).toBe('function')

    _handler()

    await flushPromises()

    expect(wrapper.text()).toBe('1')

    expect(removeEventListener.mock.calls.length).toBe(1)
    expect(removeEventListener.mock.calls[0][0]).toBe('load')

    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete',
    })

    addEventListener.mockRestore()
    removeEventListener.mockRestore()
  })

  it('should call hook', async () => {
    const addEventListener = jest.spyOn(window, 'addEventListener')
    const {wrapper} = setup()

    expect(wrapper.text()).toBe('0')

    await flushPromises()

    expect(wrapper.text()).toBe('1')

    expect(addEventListener.mock.calls.length).toBe(0)

    addEventListener.mockRestore()
  })
})
