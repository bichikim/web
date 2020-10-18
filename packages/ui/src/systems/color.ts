import {Property} from 'csstype'
import {RequiredTheme, ResponsiveValue, system, Theme} from 'styled-system'

export interface ColorProps<T extends Theme = RequiredTheme> {
  color?: ResponsiveValue<Property.Color, T>
}

export const color = system({
  color: {
    property: 'color',
  },
})

export interface BackgroundColorProps<T extends Theme = RequiredTheme> {
  bg?: ResponsiveValue<Property.BackgroundColor, T>
  backgroundColor?: ResponsiveValue<Property.BackgroundColor, T>
}

export const backgroundColor = system({
  bg: {
    property: 'backgroundColor',
  },
  backgroundColor: {
    property: 'backgroundColor',
  },
})
