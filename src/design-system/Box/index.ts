import {ExtractPropTypes, FunctionalComponent, h} from 'vue'
import {Container, containerProps} from './Container'

export const Box: FunctionalComponent<ExtractPropTypes<typeof containerProps>> =
  (Props, {slots}) => h(Container, {css: Props.css}, () => slots.default?.())
