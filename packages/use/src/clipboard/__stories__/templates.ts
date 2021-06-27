import {useClipboard} from '../'
import {h, ref} from 'vue'

export const Default = () => ({
  setup() {
    const valueRef = ref('')
    const {write} = useClipboard(valueRef)
    const setValue = (value) => {
      valueRef.value = value
    }

    return () => (
      h('div', [
        h('div', 'hello world'),
        h('div', valueRef.value),
        h('input', {onInput: (event) => setValue(event.target.value), value: valueRef.value}),
        h('button', {onClick: () => write(valueRef.value)}, 'copy'),
      ])
    )
  },
})
