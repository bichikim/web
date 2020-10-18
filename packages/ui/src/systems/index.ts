import {
  BackgroundProps,
  compose,
  margin,
  MarginProps,
  padding,
  PaddingProps,
  position,
  grid,
  PositionProps,
  RequiredTheme,
  GridProps,
  Theme,
} from 'styled-system'
import {backgroundColor, BackgroundColorProps, color, ColorProps} from './color'
import {
  border,
  BorderProps,
  boxShadow,
  BoxShadowProps,
  display,
  DisplayProps,
  flex,
  flexItem,
  FlexItemProps,
  FlexProps,
  overflow,
  OverflowProps,
  size,
  SizeProps,
  text,
  TextProps,
} from './styles'
export * from './flex-column'
export * from './flex-range'
export * from './position'
export * from './styles'
export * from './show'
export * from './flex-column'
export * from './gap'
export * from './flex-wrap'
export * from './text-decoration'
export * from './color'
export {
  system, ShadowProps, Theme, ResponsiveValue, PaddingProps, MarginProps,
  padding, margin, PositionProps, grid, GridProps,
} from 'styled-system'

const systems = {
  color,
  backgroundColor,
  overflow,
  padding,
  margin,
  boxShadow,
  position,
  border,
  display,
  size,
  flexItem,
  flex,
  text,
  grid,
}

type Systems = typeof systems

export type SystemsMap = Record<keyof Systems, boolean>

export const allSystemTrueMap: SystemsMap = {
  backgroundColor: true,
  color: true,
  margin: true,
  padding: true,
  border: true,
  display: true,
  flexItem: true,
  size: true,
  overflow: true,
  boxShadow: true,
  position: true,
  text: true,
  flex: true,
  grid: true,
}

export const allSystem = compose(
  ...Object.keys(systems).map((key) => systems[key]),
)

export const getSystems = (map: Partial<SystemsMap>) => {
  return Object.keys(map).map((key) => {
    const value = map[key]
    return value ? systems[key] : null
  })
}

export interface AllSystemProps<T extends Theme = RequiredTheme> extends ColorProps<T>, PaddingProps<T>,
  MarginProps<T>, BackgroundColorProps<T>, SizeProps<T>,
  BackgroundProps<T>, BorderProps<T>, OverflowProps<T>, PositionProps<T>,
  BorderProps<T>, DisplayProps<T>, FlexProps<T>, TextProps<T>,
  BoxShadowProps<T>, FlexItemProps<T>, GridProps<T> {
  // empty
}
