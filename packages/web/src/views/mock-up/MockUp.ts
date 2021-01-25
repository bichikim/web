import {Flex} from '@winter-love/ui'
import {defineComponent, h} from 'vue'
import Flexs from './Flexs'
import Inputs from './Inputs'
import Labels from './Labels'

export default defineComponent({
  setup() {
    const gap = 10
    return () => {
      return (
        h(Flex, {column: true, gap}, () => [
          h(Inputs),
          h(Flexs),
          h(Labels),
        ])
      )
    }
  },
})
