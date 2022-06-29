import {defineComponent, h} from 'vue'
import {useUser} from './user'

export const Component = defineComponent({
  name: 'PropsState',
  setup() {
    const user = useUser()
    return () => h('div', [user.name])
  },
})
