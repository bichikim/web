import {defineComponent} from 'vue'

const IndexPage = defineComponent({
  setup() {
    return () => {
      return (
        <div v-emotion={[{color: 'red'}]}>hello</div>
      )
    }
  },
})

export default IndexPage
