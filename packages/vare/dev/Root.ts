import {defineComponent, h, ref} from 'vue'
import {Component} from './Component'
import {PropsState} from './PropsState'
import {LocalState} from './LocalState'
export const Root = defineComponent({
  setup() {
    const name = ref('bar')
    const onChange = () => {
      name.value = `${name.value}o`
    }
    return () => (
      h('div', [
        h(Component),
        h('button', {onClick: onChange}, 'change'),
        h('div', name.value),
        h(PropsState),
        h(PropsState),
        h(LocalState),
        h(LocalState),
      ])
    )
  },
})
