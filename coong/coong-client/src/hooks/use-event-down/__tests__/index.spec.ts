/**
 * @jest-environment jsdom
 */
import {useEventDown} from '../'
import {mount} from '@winter-love/test-utils'
import {defineComponent, h, ref} from 'vue'
import {describe, expect, it, vi} from 'vitest'
describe('use-event-down', () => {
  const wrapper = mount(
    defineComponent({
      setup() {
        const element: any = ref(null)
        const elementState = useEventDown(element)
        return () =>
          h('div', {'data-testid': 'element', ref: element}, elementState.value)
      },
    }) as any,
  )

  it('should change state when a user trigger a down and up event', async () => {
    expect(wrapper.text()).toBe('false')

    await wrapper.get('div').trigger('pointerdown')

    expect(wrapper.text()).toBe('true')

    await wrapper.get('div').trigger('pointerup')

    expect(wrapper.text()).toBe('false')
  })
})
