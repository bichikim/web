import Stitches from '@stitches/core/types/stitches'
import {computed, defineComponent, h, toRef, withDirectives} from 'vue-demi'
import {createDirective} from './directive'

export interface StyledOptions {
  name?: string
  stylePortal?: string
}

export const createStyled = <S extends Stitches>(stitches: S) => {
  return function styled(element, options: StyledOptions = {}, ...systems: Parameters<S['css']>) {
    const {name, stylePortal = 'css'} = options
    const directive = createDirective(stitches as any, ...systems as any)
    return defineComponent({
      name,
      props: {
        as: {type: String},
        [stylePortal]: {default: () => ({}), type: Object},
      },
      setup(props) {
        const asRef = toRef(props, 'as')
        const cssRef = toRef(props, stylePortal)

        const elementRef = computed(() => {
          return asRef.value ?? element
        })

        return () => (
          withDirectives(h(elementRef.value), [[directive, cssRef.value]])
        )
      },
    })
  }
}
