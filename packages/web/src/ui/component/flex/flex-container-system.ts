import {WrapProps} from './types'
import {column, ColumnProps, createGap, flexWrap, FlexWrapProps, GapProps} from '../../systems'
import {
  color,
  ColorProps,
  compose, flexbox,
  FlexboxProps,
  padding,
  PaddingProps, position,
  PositionProps,
} from 'styled-system'
import fluid from 'fluid-system'

export type FlexContainerProps = FlexWrapProps &
  ColorProps & FlexboxProps & PositionProps & ColumnProps & GapProps & WrapProps &
  PaddingProps & JSX.IntrinsicElements['div']

export const flexContainerSystems = [
  {
    boxSizing: 'border-box',
    display: 'flex',
    height: '100%',
    position: 'relative',
  },
  flexWrap,
  column,
  createGap('100%'),
  fluid(compose(color, padding, position, flexbox)),
]
