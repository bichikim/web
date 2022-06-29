import {debug} from '../'
import {defineComponent, h, ref} from 'vue'
import {mount} from '@vue/test-utils'

describe('debug', () => {
  it('should debug', () => {
    const Component = defineComponent({
      setup() {
        const name = ref('foo')
        debug({
          name,
        })
        return () => h('div', name.value)
      },
    })
    const wrapper = mount(Component)
    expect(wrapper.get('div').text()).toBe('foo')
    expect(wrapper.vm.$.setupState).toEqual({
      name: 'foo',
    })
  })
})
