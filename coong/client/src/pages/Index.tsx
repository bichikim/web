import {defineComponent} from 'vue'
import {Box} from 'src/components/Box'

const IndexPage = defineComponent({
  setup() {
    return () => {
      return (
        <div>
          <div v-stitches={[{color: '$red1'}]}>
            hello
          </div>
          <Box>foo</Box>
        </div>
      )
    }
  },
})

export default IndexPage
