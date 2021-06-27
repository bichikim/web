import {defineComponent, h, ref} from 'vue'
import {useAppClipboard} from 'src/use'

export const Main = defineComponent({
  name: 'Main',
  setup() {
    const valueRef = ref('')
    const inputRef = ref('')
    const {write} = useAppClipboard(valueRef)
    return () => (
      h('div', [
        h('div', valueRef.value),
        h('div', inputRef.value),
        h('input', {onInput: (event) => (inputRef.value = event.target.value), value: inputRef.value}),
        h('button', {onClick: () => write(valueRef.value)}, 'copy'),
      ])
    )
  },
})

export default Main
