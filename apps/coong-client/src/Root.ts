// import {provideClient} from '@urql/vue'
// import {client} from 'src/graphql'
import {defineComponent, h} from 'vue'
import {RouterView} from 'vue-router'

export const Root = defineComponent({
  setup: () => {
    // provideClient(client)
    return () => h('div', {class: 'h-full'}, h(RouterView))
  },
})
