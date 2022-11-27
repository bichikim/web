/**
 * @jest-environment jsdom
 */
import {useGlobalTouchMove} from '../'
import {defineComponent, flushPromises, h, mountComposition} from '@winter-love/vue-test'

describe('useGlobalTouchMove', () => {
  const Component = defineComponent({
    setup() {
      const state = useGlobalTouchMove()
      console.log(state)
      return () => h('div', {}, state.value)
    },
  })
  const wrapper1 = mountComposition(() => {
    return useGlobalTouchMove()
  })
  const wrapper2 = mountComposition(() => {
    return useGlobalTouchMove()
  })
  it('should update state globally with touch move event', async () => {
    expect(wrapper1.setupState.value).toBeNull()
    expect(wrapper2.setupState.value).toBeNull()
    const changedTouches = ['changedTouches' as any]
    const event = new TouchEvent('touchmove', {changedTouches})
    window.dispatchEvent(event)
    await flushPromises()
    expect(wrapper1.setupState.value).toEqual(changedTouches)
    expect(wrapper2.setupState.value).toEqual(changedTouches)
  })
})
