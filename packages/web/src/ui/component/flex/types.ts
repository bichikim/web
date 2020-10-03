import {
  BorderShortProps, FlexColumnProps, FontShortProps, GapProps, ShowProps, BorderProps,
  ColorProps,
  FlexboxProps,
  LayoutProps,
  PaddingProps,
  PositionProps,
  ResponsiveValue,
} from '@/ui/systems'
import {Property} from 'csstype'
import {ASProps} from '@/types'

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
