import {FunctionalComponent, h} from 'vue-demi'
import {withCsx} from '../with-csx'

export interface BoxProps {
  as?: string
  onChange?: (...args: any[]) => any
  onClick?: (...args: any[]) => any
  onInput?: (...args: any[]) => any
  onMouseDown?: (...args: any[]) => any
  onMouseOut?: (...args: any[]) => any
  onMouseOver?: (...args: any[]) => any
  onMouseUp?: (...args: any[]) => any
}

export const Box: FunctionalComponent<BoxProps> = (props, {slots}) => {
  return h(props.as ?? 'div', {}, slots)
}

Box.props = ['as']

export const HBox = withCsx<BoxProps>(Box, 'HBox')
