import {toMutRef} from '../'
import {defineComponent, h, ref} from 'vue-demi'

const Foo = defineComponent({
  props: {
    value: {default: '', type: String},
  },
  setup(props) {
    const valueRef = toMutRef(props, 'value')
    return () => h('div', [
      h('div', valueRef.value),
      h('button', {onClick: () => (valueRef.value += '.')}, 'add dot'),
    ])
  },
})

export const Default = () => ({
  setup() {
    const valueRef = ref('foo')

    const updateInput = (event) => {
      valueRef.value = event.target.value
    }

    return () => (
      h('div', [
        h('div', `value ${valueRef.value}`),
        h('input', {onInput: updateInput, value: valueRef.value}),
        h(Foo, {value: valueRef.value}),
      ])
    )
  },
})
