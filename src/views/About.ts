import {defineComponent, h} from 'vue'

export default defineComponent({
  setup() {
    return () => {
      return (
        h('div', {}, 'about')
      )
    }
  },
})
