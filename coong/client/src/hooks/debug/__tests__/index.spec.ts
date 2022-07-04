import {debug} from '../'
import {defineComponent, getCurrentInstance, h, ref} from 'vue-demi'
import {mount} from '@vue/test-utils'

describe('debug', () => {
  // debug 테스트에 문제가 있습니다 getCurrentInstance 가 mount 시 작동 하지 않습니다
  it.skip('should debug', async () => {
    const Component = defineComponent({
      setup() {
        const instance = getCurrentInstance()
        console.log(instance)
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
