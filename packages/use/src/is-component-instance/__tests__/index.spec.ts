import {isComponentInstance} from '../'
import {mount} from '@vue/test-utils'
import {defineComponent, h} from 'vue'

describe('isComponentInstance', () => {
  it('should return true', () => {
    const Component = defineComponent({
      setup() {
        return () => h('div')
      },
    })

    const wrapper = mount(Component)

    expect(isComponentInstance(wrapper.vm)).toBe(true)
    expect(isComponentInstance(wrapper.element)).toBe(false)
  })
})
