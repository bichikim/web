import {defineComponent, h} from 'vue'
import {useBar, useFoo, useJohn} from './store'

export const Component = defineComponent({
  name: 'Component',
  setup() {
    const foo = useFoo()
    const bar = useBar()
    const john = useJohn()
    return () => (
      h('div', [
        h('div', foo.foo),
        h('div', foo.decoFoo),
        h('button', {onClick: foo.increase}, 'foo increase'),
        h('div', bar.name),
        h('div', bar.decoFoo),
        h('button', {onClick: bar.increase}, 'bar increase'),
        h('button', {onClick: john.changeName}, 'change name'),
        h('div', john.name),
      ])
    )
  },
})
