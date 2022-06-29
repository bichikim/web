import {defineComponent, h} from 'vue-demi'
import {isInInstance} from '../'
import {mount} from '@vue/test-utils'

describe('isInInstance', () => {
  it('should return ture if it is in a vue component instance', () => {
    const Component = defineComponent({
      setup() {
        const result = isInInstance()
        return () => h('div', result)
      },
    })

    const wrapper = mount(Component)

    expect(wrapper.get('div').text()).toBe('true')
  })
  it('should return false if it is not in a vue component instance', () => {
    const result = isInInstance()

    expect(result).toBe(false)
  })
})
