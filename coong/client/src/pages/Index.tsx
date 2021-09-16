import {defineComponent} from 'vue'

const IndexPage = defineComponent({
  setup() {
    return () => {
      return (
        <div v-stitches={[{color: '$red1'}]}>
          hello
        </div>
      )
    }
  },
})

export default IndexPage
