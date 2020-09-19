import {defineComponent, h, computed} from 'vue'
import {state, setName, setDeepName} from '@/store'

export default defineComponent({
  setup() {
    const name = computed(() => (state.name))
    const deepName = computed(() => (state.deep.name))
    return (context: any) => {
      const {$parent} = context
      const cache = $parent.$emotionCache
      // testing cache working ok!
      // todo need to use this for emotion
      console.log(cache)
      return (
        h('div', {}, [
          h('div', [
            h('span', 'name'),
            h('span', name.value),
          ]),
          h('div', [
            h('span', 'deep name'),
            h('span', deepName.value),
          ]),
          h('div', [
            h('button', {onclick: () => setName(name.value + 'A')}, 'add A'),
            h('button', {onclick: () => setDeepName(deepName.value + 'D')}, 'add deep D'),
          ]),
        ])
      )
    }
  },
})
