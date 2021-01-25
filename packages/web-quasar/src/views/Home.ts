import {computed, defineComponent, h, ref} from 'vue'

export default defineComponent({
  name: 'home',
  setup() {
    return () => {
      return (
        h('div', {}, [
          h('div', 'hi?'),
        ])
      )
    }
  },
})
