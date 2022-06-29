import {defineComponent} from 'vue'
import {RouterView} from 'vue-router'

export const Root = defineComponent(() => {
  return () => (
    <div>
      <RouterView />
    </div>
  )
})

export default Root
