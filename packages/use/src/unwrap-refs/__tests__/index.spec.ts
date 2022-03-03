import {defineComponent, h, ref} from 'vue-demi'
import {mount} from '@vue/test-utils'
import {unWrapRefs} from '../'

describe('unwrap-refs', () => {
  it('should notion', () => {
    const Text = defineComponent({
      props: ['foo', 'bar'],
      setup: (props) => {
        return () => (
          h('div', [
            h('div', {id: 'foo'}, props.foo),
            h('div', {id: 'bar'}, props.bar),
          ])
        )
      },
    })
    const Component = defineComponent({
      setup() {
        const foo = ref('foo')
        const bar = ref('bar')
        return () => (
          h(Text, unWrapRefs({bar, foo}))
        )
      },
    })

    const wrapper = mount(Component)

    expect(wrapper.get('#foo').text()).toBe('foo')
    expect(wrapper.get('#bar').text()).toBe('bar')
  })
})
