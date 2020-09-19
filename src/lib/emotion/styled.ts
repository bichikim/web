import {getRegisteredStyles, insertStyles} from '@emotion/utils'
import {serializeStyles} from '@emotion/serialize'
import {defineComponent, h, ref, computed, inject} from 'vue'

export const themeSym = Symbol('theme')

export const styled = (tag: string = 'div') => {
  return defineComponent({
    props: {
      as: String,
    },
    setup(props) {
      console.log(props)
      const theme = inject(themeSym, {})
      const as = computed(() => (props.as || tag))
      return () => {
        return (
          h(as.value)
        )
      }
    },
  })
}
