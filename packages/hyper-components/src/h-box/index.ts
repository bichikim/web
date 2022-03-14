import {FunctionalComponent, h} from 'vue'
import {withCsx} from '../with-csx'

export interface BoxProps {
  as?: string
}

export const Box: FunctionalComponent<BoxProps> = (props, {slots}) => {
  return h(props.as ?? 'div', {}, slots)
}

Box.props = ['as']

export const HBox = withCsx<BoxProps>(Box, 'HBox')
