import {defineComponent, h} from 'vue'
import {RouterView} from 'vue-router'

export default defineComponent({
  render() {
    return (
      h('div', {}, [
        'hello',
        h(RouterView),
      ])
    )
  },
  setup() {
    return {}
  },
})
