import {Component} from 'dev/Component'
import {defineComponent, h, ref} from 'vue'
import {useUser} from './user'

export const Root = defineComponent({
  setup() {
    const name = ref('bar')
    const user = useUser()
    const onChange = () => {
      name.value = `${name.value}o`
    }
    return () =>
      h('div', [
        user.name,
        h(Component),
        h('button', {onClick: user.addName}, 'change'),
        h('div', name.value),
      ])
  },
})
