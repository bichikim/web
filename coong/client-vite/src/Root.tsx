import {provideClient} from '@urql/vue'
import {client} from 'src/graphql'
import {defineComponent} from 'vue'
import {RouterView} from 'vue-router'

export const Root = defineComponent({
  setup: () => {
    provideClient(client)
    return () => (
      <div>
        <RouterView />
      </div>
    )
  },
})

export default Root
