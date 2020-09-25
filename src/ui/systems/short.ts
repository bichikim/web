import {RequiredTheme, ResponsiveValue, system, Theme} from 'styled-system'
import {Property} from 'csstype'

export interface FontShortProps<T extends Theme = RequiredTheme> {
  /**
   * css fontSize
   */
  fs?: ResponsiveValue<Property.FontSize, T>
  /**
   * css fontWeight
   */
  fw?: ResponsiveValue<Property.FontWeight, T>
}

export const fontShort = system({
  fs: {
    property: 'fontSize',
  },
  fw: {
    property: 'fontWeight',
  },
})
export interface FlexShortProps<T extends Theme = RequiredTheme> {
  fai?: ResponsiveValue<Property.AlignItems, T>
  fji?: ResponsiveValue<Property.JustifyItems, T>
}

export const flexShort = system({
  fai: {
    property: 'alignItems',
  },
  fji: {
    property: 'justifyItems',
  },
})

export interface DisplayShortProps<T extends Theme = RequiredTheme> {
  dp: ResponsiveValue<Property.Display, T>
}

export const displayShort = system({
  dp: {
    property: 'display',
  },
})

export interface BorderShortProps<T extends Theme = RequiredTheme> {
  bb?: ResponsiveValue<Property.BorderBottom, T>
  bbw?: ResponsiveValue<Property.BorderBottomWidth, T>
  bc?: ResponsiveValue<Property.BorderColor, T>
  bl?: ResponsiveValue<Property.BorderLeft, T>
  blw?: ResponsiveValue<Property.BorderLeftWidth, T>
  br?: ResponsiveValue<Property.BorderRight, T>
  brw?: ResponsiveValue<Property.BorderRightWidth, T>
  bs?: ResponsiveValue<Property.BorderWidth, T>
  bt?: ResponsiveValue<Property.BorderTop, T>
  btw?: ResponsiveValue<Property.BorderTopWidth, T>
  bx?: ResponsiveValue<Property.BorderLeft, T>
  bxw?: ResponsiveValue<Property.BorderLeftWidth, T>
  by?: ResponsiveValue<Property.BorderTop, T>
  byw?: ResponsiveValue<Property.BorderTopWidth, T>
  ba?: ResponsiveValue<Property.BorderRadius, T>
}

export interface BoxShadowShortProps<T extends Theme = RequiredTheme> {
  sdw: ResponsiveValue<Property.BoxShadow, T>
}

export const boxShadowShort = system({
  sdw: {
    property: 'boxShadow',
  },
})

export const borderShort = system({
  bra: {
    property: 'borderRadius',
  },
  bb: {
    property: 'borderBottom',
  },
  bbw: {
    property: 'borderBottomWidth',
  },
  bc: {
    property: 'borderColor',
  },
  bl: {
    property: 'borderLeft',
  },
  blw: {
    property: 'borderLeftWidth',
  },
  br: {
    property: 'borderRight',
  },
  brw: {
    property: 'borderRightWidth',
  },
  bs: {
    property: 'borderWidth',
  },
  bt: {
    property: 'borderTop',
  },
  btw: {
    property: 'borderTopWidth',
  },
  bx: {
    properties: ['borderRight', 'borderLeft'],
  },
  bxw: {
    properties: ['borderRightWidth', 'borderLeftWidth'],
  },
  by: {
    properties: ['borderBottom', 'borderTop'],
  },
  byw: {
    properties: ['borderBottomWidth', 'borderTopWidth'],
  },
})
