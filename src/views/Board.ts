import {defineComponent, h} from 'vue'
import {Box, Flex} from '@/ui'

const shadow = '0px 10px 1px #ddd, 0 10px 20px #ccc'

export default defineComponent({
  setup() {
    return () => {
      return (
        h(Flex, {bg: 'WhiteSmoke', color: 'white', gap: 10}, () => [
          h(Box, {bg: 'tomato', p: 10, bra: 10, range: 'auto', sdw: shadow, animate: [{scale: 2}, {scale: 1}]}, () => 'click'),
        ])
      )
    }
  },
})
