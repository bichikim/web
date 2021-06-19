import {onClickOutside} from '../'
import {defineComponent, ref, h} from 'vue'
import {mount, flushPromises} from '@vue/test-utils'

const setup = () => {
  const spy = jest.spyOn(window, 'addEventListener')

  const Component = defineComponent({
    setup() {
      const elementRef = ref()
      const count = ref(0)
      onClickOutside(elementRef, () => {
        count.value += 1
      })
      return () => (
        h('div', [
          h('div', {id: 'count'}, count.value),
          h('div', {id: 'target', ref: elementRef}, 'foo'),
        ])
      )
    },
  })

  const wrapper = mount(Component)

  return {
    spy,
    wrapper,
  }
}

describe('onClickOutside', () => {
  it('should call handler with clicking outside', async () => {
    const {wrapper, spy} = setup()
    expect(wrapper.get('#count').text()).toBe('0')
    expect(spy.mock.calls.length).toBe(1)
    expect(spy.mock.calls[0][0]).toBe('pointerdown')
    const listener: any = spy.mock.calls[0][1]
    const fakeEvent: any = {
      composedPath: () => {
        return []
      },
      target: window,
    }

    listener(fakeEvent)

    await flushPromises()

    expect(wrapper.get('#count').text()).toBe('1')
    spy.mockClear()
  })
  it('should not call handler with clicking target', async () => {
    const {wrapper, spy} = setup()
    expect(wrapper.get('#count').text()).toBe('0')
    expect(spy.mock.calls.length).toBe(1)
    expect(spy.mock.calls[0][0]).toBe('pointerdown')
    const listener: any = spy.mock.calls[0][1]
    const fakeEvent: any = {
      composedPath: () => {
        return []
      },
      target: wrapper.get('#target').element,
    }

    listener(fakeEvent)

    await flushPromises()

    expect(wrapper.get('#count').text()).toBe('0')
    spy.mockClear()
  })
  it('should not call handler without clicking composed path including', async () => {
    const {wrapper, spy} = setup()
    expect(wrapper.get('#count').text()).toBe('0')
    expect(spy.mock.calls.length).toBe(1)
    expect(spy.mock.calls[0][0]).toBe('pointerdown')
    const listener: any = spy.mock.calls[0][1]
    const fakeEvent: any = {
      composedPath: () => {
        return [wrapper.get('#target').element]
      },
      target: wrapper.get('#count').element,
    }

    listener(fakeEvent)

    await flushPromises()

    expect(wrapper.get('#count').text()).toBe('0')
    spy.mockClear()
  })
})
