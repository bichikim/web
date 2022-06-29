import {createProvide} from '../'
import {defineComponent, h} from 'vue'
import {mount} from '@vue/test-utils'
import {expectType} from 'tsd'

const setup = () => {
  const {provide, inject} = createProvide('foo')

  const Component2 = defineComponent({
    setup() {
      const value = inject()

      expectType<string | undefined>(value)

      return () => h('div', value)
    },
  })

  const Component = defineComponent({
    setup() {
      provide()
      return () => h(Component2)
    },
  })

  const wrapper = mount(Component)

  return {
    wrapper,
  }
}

describe('createProvide', () => {
  it('should provide & inject data', () => {
    const {wrapper} = setup()

    expect(wrapper.text()).toBe('foo')
  })
})
