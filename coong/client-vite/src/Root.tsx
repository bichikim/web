import {defineComponent} from 'vue'
import {RouterView} from 'vue-router'

export const Root = defineComponent({
  setup: () => {
    return () => (
      <div>
        <RouterView />
      </div>
    )
  },
})

export default Root
