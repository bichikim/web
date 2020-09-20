import {ResponsiveValue, style} from 'styled-system'
import {Property} from 'csstype'

export interface TextDecorationProps {
  td?: ResponsiveValue<Property.TextDecoration>
  textDecoration?: ResponsiveValue<Property.TextDecoration>
}

export const textDecoration = style({
  alias: 'td',
  cssProperty: 'textDecoration',
  prop: 'textDecoration',
})
