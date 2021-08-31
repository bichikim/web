import {defineComponent} from 'vue'
import {useCreateEmotionNode} from 'src/emotion'
import {QBtn} from 'src/quasar'

const IndexPage = defineComponent({
  setup() {
    const h = useCreateEmotionNode()
    return () => {
      return (
        h('div', {$emotion: {color: 'red'}}, [
          'hello',
          h(QBtn, {})
        ])
      )
    }
  },
})

export default IndexPage
