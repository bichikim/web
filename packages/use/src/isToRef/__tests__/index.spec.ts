import {isToRef} from '../'
import {computed, defineComponent, h, ref, toRef} from 'vue-demi'
import {mount} from '@vue/test-utils'

const Component = defineComponent({
  props: {
    foo: {default: '', type: String},
  },
  setup(props) {
    const fooProp = toRef(props, 'foo')
    const fooRef = ref('foo')
    const fooComputed = computed(() => 'foo')
    const toRefResult = isToRef(fooProp)
    const refResult = isToRef(fooRef)
    const computedResult = isToRef(fooComputed)

    return () => (
      h('div', [
        h('div', {id: 'toRef'}, toRefResult),
        h('div', {id: 'ref'}, refResult),
        h('div', {id: 'computed'}, computedResult),
      ])
    )
  },
})

describe('isToRef', () => {
  it('should be ref', () => {
    const wrapper = mount(Component)

    expect(wrapper.get('#toRef').text()).toEqual('true')
    expect(wrapper.get('#ref').text()).toEqual('false')
    expect(wrapper.get('#computed').text()).toEqual('false')
  })
})
