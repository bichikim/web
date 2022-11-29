import {defineComponent, h} from 'vue'

/**
 * export TestPage
 */
export default defineComponent({
  name: 'TestPage',
  setup: () => {
    return () => h('div', 'hello test page')
  },
})
