import {RequiredTheme, ResponsiveValue, style, Theme} from 'styled-system'
import {Property} from 'csstype'

export interface TextDecorationProps<T extends Theme = RequiredTheme> {
  td?: ResponsiveValue<Property.TextDecoration, T>
  textDecoration?: ResponsiveValue<Property.TextDecoration, T>
}

export const textDecoration = style({
  alias: 'td',
  cssProperty: 'textDecoration',
  prop: 'textDecoration',
})
