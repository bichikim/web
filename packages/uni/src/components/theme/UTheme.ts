import {defineComponent, toRef} from 'vue'
import {provideTheme} from './use-theme'

export const UTheme = defineComponent({
  name: 'UTheme',
  props: {
    theme: {type: String},
  },
  setup(props, {slots}) {
    const themeProp = toRef(props, 'theme', 'unknown')
    provideTheme('body', themeProp)

    return () => slots.default?.()
  },
})
