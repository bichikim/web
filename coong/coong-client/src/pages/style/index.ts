import {defineComponent, h, ref} from 'vue'

const StylePage = defineComponent({
  setup() {
    const elementRef = ref(null)
    return () =>
      h('div', {ref: elementRef}, [
        // div
        h('form', [
          //
          h('input', {max: 500, min: 0, type: 'range'}),
        ]),
      ])
  },
})
export default StylePage
