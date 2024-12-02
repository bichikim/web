/**
 * @vitest-environment jsdom
 */
import {mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'
import {defineComponent, h, ref} from 'vue'
import {useEventDown} from '../'

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
