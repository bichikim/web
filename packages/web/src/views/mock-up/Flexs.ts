import {Box, Flex} from '@winter-love/ui'
import {defineComponent, h} from 'vue'

// eslint-disable-next-line quotes
const longText = `보이는 사랑의 끓는 눈에 황금시대를 관현악이며, 것이다. 자신과 예가 노래하며 보이는 있으랴? 관현악이며, 위하여서 청춘은 투명하되 피다. 하였으며, 가치를 있는 너의 이상 밥을 뜨거운지라, 것이다. 있는 없으면, 생의 아니더면, 넣는 일월과 것이다. 피가 광야에서 끝에 품고 옷을 이상은 사는가 듣기만 보라. 길지 꽃 피에 품에 있는 사라지지 사막이다. 위하여서, 없으면, 예가 영락과 끝에 있는 때까지 청춘 열락의 때문이다. 사랑의 구하지 사라지지 커다란 속에서 가치를 속잎나고, 그들은 남는 쓸쓸하랴? 황금시대의 때에, 것은 가슴에 석가는 구할 위하여서.`

export default defineComponent(() => {
  return () => {
    const p = 10
    const bg1 = 'SandyBrown'
    const bg2 = 'Silver'
    const bg3 = 'WhiteSmoke'
    const gap = 10
    const miniBasis = 80

    return (
      h(Flex, {column: true, gap}, () => [
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
        h(Box, {p}, () => 'flex overflow'),
        h(Flex, {bg: bg3, gap}, () => [
          h(Box, {range: 'space', bg: bg2, p, overflow: 'hiddlen'}, () => longText),
          h(Box, {range: 'auto', bg: bg2, p}, () => 'auto-range-size'),
        ]),
      ])
    )
  }
})
