import {
  compose, space, color, flexbox, typography,
  shadow, background, border, layout, position,
  SpaceProps, ColorProps, FlexboxProps, TypographyProps, ShadowProps,
  BackgroundProps, BorderProps, LayoutProps, PositionProps, Theme, RequiredTheme,
} from 'styled-system'
import {
  borderShort, BorderShortProps, displayShort, DisplayShortProps, flexShort,
  FlexShortProps, fontShort, FontShortProps, boxShadowShort, BoxShadowShortProps,
} from './short'
import {TextDecorationProps, textDecoration} from './text-decoration'
export * from './flex-column'
export * from './flex-range'
export * from './position'
export * from './short'
export * from './show'
export * from './gap'
export * from './flex-wrap'
export * from './text-decoration'
export * from 'styled-system'

export const allSystem = compose(
  flexbox, space, color, typography, shadow, background, border, layout, boxShadowShort,
  position, textDecoration, borderShort, displayShort, flexShort, fontShort,
)

export interface AllSystemProps<T extends Theme = RequiredTheme> extends
  SpaceProps<T>, ColorProps<T>, FlexboxProps<T>, TypographyProps<T>, ShadowProps<T>,
  BackgroundProps<T>, BorderProps<T>, LayoutProps<T>, PositionProps<T>, TextDecorationProps<T>,
  BorderShortProps<T>, DisplayShortProps<T>, FlexShortProps<T>, FontShortProps<T>,
  BoxShadowShortProps<T>
  {
  // empty
}
