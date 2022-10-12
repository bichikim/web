import {defineComponent} from 'vue'
import {Piano} from './components'

export const Main = defineComponent({
  setup() {
    return () => (
      <div>
        <Piano />
      </div>
    )
  },
})

export default Main
