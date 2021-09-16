import Stitches from '@stitches/core/types/stitches'
import {computed, defineComponent, h, toRef, withDirectives} from 'vue-demi'
import {createDirective} from './directive'

export interface StyledOptions {
  name?: string
}

export const createStyled = <S extends Stitches>(stitches: S) => {
  return function styled(element, options: StyledOptions = {}, ...systems: Parameters<S['css']>) {
    const {name} = options
    const directive = createDirective(stitches as any, ...systems as any)
    return defineComponent({
      name,
      props: {
        as: {type: String},
        css: {default: () => ({}), type: Object},
        variants: {default: () => ({}), type: Object},
      },
      setup(props) {
        const asRef = toRef(props, 'as')

        const elementRef = computed(() => {
          return asRef.value ?? element
        })

        return () => (
          withDirectives(h(elementRef.value), [[directive, [props.css, props.variants]]])
        )
      },
    })
  }
}
