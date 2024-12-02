import {defineComponent, h} from 'vue'

export const HLoading = defineComponent({
  name: 'HLoading',
  setup: () => {
    return () =>
      h('div', [
        //
        h('span', {class: 'text-30px'}, 'Loading'),
      ])
  },
})
