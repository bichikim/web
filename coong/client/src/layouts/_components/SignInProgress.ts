import {defineComponent, h} from 'vue'
import {csx} from 'boot/hyper-components'

export const SignInProgress = defineComponent({
  name: 'SignInProgress',
  setup() {
    return () => (
      h('div', csx({
        css: {},
      }))
    )
  },
})
