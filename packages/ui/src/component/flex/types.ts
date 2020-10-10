import {Property} from 'csstype'
import {
  BorderProps,
  BorderShortProps,
  ColorProps,
  FlexboxProps,
  FlexColumnProps,
  FontShortProps,
  GapProps,
  LayoutProps,
  PaddingProps,
  PositionProps,
  ResponsiveValue,
  ShowProps,
} from 'src/systems'
import {ASProps} from 'src/types'

export type Range = number | 'space' | 'auto' | 'force-space'

export interface EventProps {
  /**
   * todo
   * css pointer-event (only itself)
   */
  event?: ResponsiveValue<'none' | 'auto'>
}

export interface RangeProps {
  rangeItems?: ResponsiveValue<Range>
}

export interface OffsetProps {
  offset?: ResponsiveValue<Range>
}

export interface DivisionProps {
  /**
   * @default 1
   */
  division?: ResponsiveValue<number>
}

export interface BasisProps {
  basis?: ResponsiveValue<Property.FlexBasis>
}

export interface WrapProps {
  wrap?: ResponsiveValue<Property.FlexWrap | boolean>
}

export type Props =
  & LayoutProps
  & OffsetProps
  & BasisProps
  & ColorProps
  & PaddingProps
  & PositionProps
  & GapProps
  & FlexboxProps
  & RangeProps
  & DivisionProps
  & WrapProps
  & FlexColumnProps
  & FontShortProps
  & EventProps
  & BorderShortProps
  & BorderProps
  & ShowProps
  & ASProps
