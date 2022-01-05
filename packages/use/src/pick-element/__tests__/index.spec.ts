import {pickElement} from '../'
import {mount} from '@vue/test-utils'
import {defineComponent, h} from 'vue-demi'

describe('pickElement', () => {
  it('should return a element with the element', () => {
    const element = document.createElement('div')
    const result = pickElement(element)
    expect(result).toBe(element)
  })

  it('should return a element with component', () => {
    const Component = defineComponent({
      setup() {
        return () => (
          h('div')
        )
      },
    })

    const wrapper = mount(Component)

    const result = pickElement(wrapper.vm)
    expect(result).toBe(wrapper.vm.$el)
  })
})
