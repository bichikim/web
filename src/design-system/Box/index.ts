import {ExtractPropTypes, FunctionalComponent, h, PropType} from 'vue'
import {Container} from './Container'
import {SystemProps} from 'src/design-system'

export const boxPropOptions = {
  css: {type: Object as PropType<SystemProps>},
}

export type BoxProps = Partial<ExtractPropTypes<typeof boxPropOptions>>

export const Box: FunctionalComponent<BoxProps> =
  (props, {slots}) => h(Container, props, () => slots.default?.())
