import {h, ref} from 'vue'
import {useClipboard} from '../'

export default {
  title: 'use/clipboard',
}

export const Default = () => ({
  setup() {
    const valueRef = ref('')
    const {copy} = useClipboard(valueRef)
    const setValue = (value) => {
      valueRef.value = value
    }

    return () => (
      h('div', [
        h('div', 'hello world'),
        h('div', valueRef.value),
        h('input', {onInput: (event) => setValue(event.target.value), value: valueRef.value}),
        h('button', {onClick: copy}, 'copy'),
      ])
    )
  },
})
