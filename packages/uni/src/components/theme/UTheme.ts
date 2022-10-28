import {defineComponent} from 'vue'
export const UTheme = defineComponent({
  name: 'UTheme',
  props: {
    color: {type: String},
  },
  setup(props, {slots}) {
    return () => slots.default?.()
  },
})
