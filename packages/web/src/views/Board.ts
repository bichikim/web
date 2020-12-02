import {defineComponent, h} from 'vue'
import {Box, Flex} from '@winter-love/ui'

const shadow = '0px 10px 1px #ddd, 0 10px 20px #ccc'

export default defineComponent({
  setup() {
    return () => {
      return (
        h(Flex, {bg: 'WhiteSmoke', color: 'white', gap: 10}, () => [
          h(Box, {
            bg: 'tomato',
            p: 10,
            bra: 10,
            color: 'White',
            range: 'auto',
            sdw: shadow,
            mountAni: {scale: [2, 1]},
            hoverAni: {scale: [2, 1]},
            tapAni: {scale: [2, 1]},
            onHover: () => (console.log('hover')),
            onTap: () => (console.log('tap')),
          },
          () => 'click'),
        ])
      )
    }
  },
})
