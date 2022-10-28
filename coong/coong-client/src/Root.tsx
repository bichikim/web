import {provideClient} from '@urql/vue'
import {client} from 'src/graphql'
import {defineComponent} from 'vue'
import {RouterView} from 'vue-router'
import {styled} from '@winter-love/uni'

export const HRoot = defineComponent({
  setup: () => {
    provideClient(client)
    return () => (
      <div>
        <RouterView />
      </div>
    )
  },
})

export const Root = styled(HRoot, {
  height: '100%',
})
