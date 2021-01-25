import {defineComponent, h} from 'vue'
import {RouterView} from 'vue-router'

export default defineComponent({
  // template: '<div>foo</div>',
  name: 'app',
  setup() {
    return () => {
      return h('div', {}, [
        h('div', 'hello'),
        h(RouterView),
      ])
    }
  },
  // setup() {
  //   return () => {
  //     return (
  //       h('div', () => [
  //         h('hello?'),
  //         h(RouterView),
  //       ])
  //     )
  //   }
  // },
})
