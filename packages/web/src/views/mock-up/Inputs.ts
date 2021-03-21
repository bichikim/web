import {Box, Flex, Input} from '@winter-love/ui'
import {defineComponent, h, ref} from 'vue'

export default defineComponent(() => {
  const p = 10
  const bg1 = 'SandyBrown'
  const bg2 = 'Silver'
  const gap = 10
  const ani = {y: [0, 3, -3, 0]}
  const ani2 = {y: [0, 2, 0]}

  const inputRef = ref('')
  const input = (value) => {
    inputRef.value = value
  }
  return () => {
    return (
      h(Flex, {column: true, gap}, () => [
        h(Box, {p}, () => 'Input emit and render value'),
        h(Input, {
          bg: bg1,
          p,
          onInput: input,
          value: inputRef.value,
          placeholder: 'type text here',
        }),
        h(Box, {p}, () => 'Input Animation'),
        h(Input, {
          bg: bg2,
          p,
          onInput: input,
          value: inputRef.value,
          placeholder: 'type text here',
          tapAni: ani,
          inputAni: ani2,
          hoverAni: ani,
        }),
      ])
    )
  }
})
