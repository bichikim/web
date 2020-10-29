import {Box, Flex, Input} from '@innovirus/ui'
import {defineComponent, h, ref} from 'vue'

export default defineComponent({

  setup() {
    const p = 10
    const bg1 = 'SandyBrown'
    const bg2 = 'Silver'
    const bg3 = 'WhiteSmoke'
    const gap = 10
    const miniBasis = 80
    const inputRef = ref('')
    const ani = {y: [0, 3, -3, 0]}
    const ani2 = {y: [0, 2, 0]}

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
          h(Box, {p}, () => 'Flex Wrap'),
          h(Flex, {bg: bg3, gap, wrap: true}, () => [
            h(Box, {basis: 300, p, bg: bg1}, () => 'foo'),
            h(Box, {basis: 300, p, bg: bg2}, () => 'bar'),
            h(Box, {basis: 300, p, bg: bg2}, () => 'john'),
          ]),
          h(Box, {p}, () => 'Flex range and wrap'),
          h(Flex, {bg: bg3, gap, division: 12, wrap: true}, () => [
            h(Box, {basis: miniBasis, range: 1, bg: bg2, p}, () => '1'),
            h(Box, {basis: miniBasis, range: 1, bg: bg2, p}, () => '1'),
            h(Box, {basis: miniBasis, range: 1, bg: bg2, p}, () => '1'),
            h(Box, {basis: miniBasis, range: 1, bg: bg2, p}, () => '1'),
            h(Box, {basis: miniBasis, range: 1, bg: bg2, p}, () => '1'),
            h(Box, {basis: miniBasis * 2, range: 2, bg: bg1, p}, () => '2'),
            h(Box, {basis: miniBasis, range: 1, bg: bg2, p}, () => '1'),
            h(Box, {basis: miniBasis, range: 1, bg: bg2, p}, () => '1'),
            h(Box, {basis: miniBasis, range: 1, bg: bg2, p}, () => '1'),
            h(Box, {basis: miniBasis, range: 1, bg: bg2, p}, () => '1'),
            h(Box, {basis: miniBasis, range: 'space', bg: bg2, p}, () => '1'),
          ]),
          h(Box, {p}, () => 'Flex division'),
          h(Flex, {bg: bg3, gap, division: 12, wrap: true}, () => [
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 2, bg: bg1, p}, () => '2'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
          ]),
          h(Flex, {bg: bg3, gap, division: 12}, () => [
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg1, p}, () => '1'),
            h(Box, {range: 1, bg: bg1, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
            h(Box, {range: 1, bg: bg2, p}, () => '1'),
          ]),
        ])
      )
    }
  },
})
