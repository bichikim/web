import {Flex, Label, Input} from '@winter-love/ui'
import {defineComponent, h} from 'vue'

export default defineComponent(() => {
  const p = 10
  const bg1 = 'SandyBrown'
  const bg2 = 'Silver'
  const bg3 = 'WhiteSmoke'
  const gap = 10
  const miniBasis = 80
  return () => {
    return (
      h(Flex, {column: true, gap}, () => [
        h('div', 'foo?'),
        h(Label, null, () => [
          h(Input, {
            bg: bg1,
            p,
            value: '??',
            placeholder: 'type text here',
          }),
        ]),
      ])
    )
  }
})
