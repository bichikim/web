/**
 * @jest-environment jsdom
 */
import {isElement} from '../'
import {mount} from '@vue/test-utils'
import {defineComponent, h} from 'vue'

describe('isElement', () => {
  it('should return true', () => {
    const Component = defineComponent({
      setup() {
        return () => h('div')
      },
    })

    const wrapper = mount(Component)

    expect(isElement(wrapper.vm)).toBe(false)
    expect(isElement(wrapper.vm.$el)).toBe(true)
  })
})
