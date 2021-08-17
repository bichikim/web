import {getWindow} from '@winter-love/utils'
import {onAnimationRepeater} from '../'
import {defineComponent, h, ref} from 'vue'
import {flushPromises, mount} from '@vue/test-utils'

jest.mock('@winter-love/utils', () => {
  return {
    getWindow: jest.fn(),
  }
})

const mockGetWindow: jest.Mock = getWindow as any

const setup = () => {
  const window = (() => {
    let _handle
    return {
      cancelAnimationFrame: jest.fn(() => {
        _handle = undefined
      }),
      requestAnimationFrame: jest.fn((handle) => {
        _handle = handle
        return 'cancel'
      }),
      trigger: () => _handle?.(),
    }
  })()

  mockGetWindow.mockImplementation(() => {
    return window
  })

  const Target = defineComponent(() => null)

  const Component = defineComponent({
    setup() {
      const countRef = ref(0)

      const toggle = onAnimationRepeater(() => {
        countRef.value += 1
      })

      const onToggle = () => {
        toggle.value = !toggle.value
      }

      return () => (
        h('div', [
          h('div', {id: 'count'}, countRef.value),
          h('div', {id: 'toggleValue'}, toggle.value),
          h('button', {id: 'toggle', onClick: onToggle}, 'toggle'),
        ])
      )
    },
  })

  const wrapper = mount(Component)

  return {
    Component,
    window,
    wrapper,
  }
}

describe('animation-repeater', () => {

  beforeEach(() => {
    mockGetWindow.mockRestore()
  })

  it('should on', async () => {
    const {wrapper, window} = setup()

    expect(wrapper.get('#count').text()).toBe('0')
    expect(wrapper.get('#toggleValue').text()).toBe('true')
    window.trigger()
    await flushPromises()
    expect(wrapper.get('#count').text()).toBe('1')
    expect(wrapper.get('#toggleValue').text()).toBe('true')

    await wrapper.get('#toggle').trigger('click')
    window.trigger()
    await flushPromises()
    expect(window.cancelAnimationFrame).toBeCalledTimes(1)
    expect(wrapper.get('#count').text()).toBe('1')
    expect(wrapper.get('#toggleValue').text()).toBe('false')

    wrapper.get('#toggle').trigger('click')
    window.trigger()
    await flushPromises()

    expect(wrapper.get('#toggleValue').text()).toBe('true')
    expect(wrapper.get('#count').text()).toBe('1')

    wrapper.get('#toggle').trigger('click')
    window.trigger()
    await flushPromises()

    expect(wrapper.get('#toggleValue').text()).toBe('false')
    expect(wrapper.get('#count').text()).toBe('1')

    await wrapper.get('#toggle').trigger('click')
    window.trigger()
    await flushPromises()

    expect(wrapper.get('#toggleValue').text()).toBe('true')
    expect(wrapper.get('#count').text()).toBe('2')
  })
})
