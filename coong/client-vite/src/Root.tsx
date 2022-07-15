import {defineComponent} from 'vue'
import {RouterView} from 'vue-router'
import {useUser} from 'src/store/user'

export const Root = defineComponent({
  setup: () => {
    // useUser()
    return () => (
      <div>
        <RouterView />
      </div>
    )
  },
})

export default Root
