import {defineComponent, h} from 'vue'
import {RouterView} from 'vue-router'

export const Root = defineComponent({
  setup: () => {
    return () => h(RouterView)
  },
})
