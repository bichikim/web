/**
 * @vitest-environment jsdom
 */
import {defineComponent, h} from 'vue'
import {isInInstance} from '../'
import {mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'

describe('isInInstance', () => {
  it('should return ture if the hook is in a vue component instance', () => {
    const Component = defineComponent({
      setup() {
        const result = isInInstance()

        return () => h('div', result)
      },
    })
    const wrapper = mount(Component)

    expect(wrapper.get('div').text()).toBe('true')
  })
  it('should return false if the hook is not in a vue component instance', () => {
    const result = isInInstance()

    expect(result).toBe(false)
  })
})
