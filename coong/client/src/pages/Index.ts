import {defineComponent} from 'vue'
import {useCreateEmotionNode} from 'src/emotion'

const IndexPage = defineComponent({
  setup() {
    const h = useCreateEmotionNode()
    return () => {
      return (
        h('div', {$emotion: {color: 'red'}}, [
          'hello',
        ])
      )
    }
  },
})

export default IndexPage
