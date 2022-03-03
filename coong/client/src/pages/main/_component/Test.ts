import {defineComponent, Fragment, h} from 'vue'
import {useHydrate, HydrateStore} from 'src/use/root-element'

export const Test = defineComponent({
  render() {
    return (
      h(Fragment, [
        h(HydrateStore),
        h('div', {id: 'foo'}, 'foo'),
        h('div', 'bar'),
      ])
    )
  },
  setup: () => {
    const nameRef = useHydrate('foo')
    return {
      nameRef,
    }
  },
})
