import {flushPromises, mount} from '@vue/test-utils'
import {defineComponent, h, ref} from 'vue-demi'
import {onDomMounted} from '../index'
import {replaceGetter, restore} from 'sinon'

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
    replaceGetter(document, 'readyState', () => 'interactive' as const)

    let _handler: any

    const addEventListener = jest.spyOn(window, 'addEventListener').mockImplementationOnce((event, handler) => {
      _handler = handler
    })

    const removeEventListener = jest.spyOn(window, 'removeEventListener')

    const {wrapper} = setup()

    expect(wrapper.text()).toBe('0')

    await flushPromises()

    expect(typeof _handler).toBe('function')

    _handler()

    await flushPromises()

    expect(wrapper.text()).toBe('1')

    expect(removeEventListener.mock.calls.length).toBe(1)
    expect(removeEventListener.mock.calls[0][0]).toBe('load')

    restore()
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
