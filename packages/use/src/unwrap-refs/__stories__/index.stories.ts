import {unWrapRefs} from '../'
import {defineComponent, h, ref} from 'vue-demi'

export const Default = () => {
  const Text = defineComponent({
    // eslint-disable-next-line vue/require-prop-types
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
  return {
    setup() {
      const foo = ref('foo')
      const bar = ref('bar')

      return () => (
        h('div', [
          h(Text, unWrapRefs({bar, foo})),
        ])
      )
    },
  }
}
