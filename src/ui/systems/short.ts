import {ResponsiveValue, system} from 'styled-system'
import {Property} from 'csstype'

export interface FontShortProps {
  /**
   * css fontSize
   */
  fs?: ResponsiveValue<Property.FontSize>
  /**
   * css fontWeight
   */
  fw?: ResponsiveValue<Property.FontWeight>
}

export const fontShort = () => {
  return system({
    fs: {
      property: 'fontSize',
    },
    fw: {
      property: 'fontWeight',
    },
  })
}

export interface TextShortProps {
  td?: ResponsiveValue<Property.TextDecoration>
}

export const textShort = () => {
  return system({
    td: {
      property: 'textDecoration',
    },
  })
}

export interface FlexShortProps {
  fai?: ResponsiveValue<Property.AlignItems>
  fji?: ResponsiveValue<Property.JustifyItems>
}

export const flexShort = () => {
  return system({
    fai: {
      property: 'alignItems',
    },
    fji: {
      property: 'justifyItems',
    },
  })
}

export interface BorderShortProps {
  bb?: ResponsiveValue<Property.BorderBottom>
  bbw?: ResponsiveValue<Property.BorderBottomWidth>
  bc?: ResponsiveValue<Property.BorderColor>
  bl?: ResponsiveValue<Property.BorderLeft>
  blw?: ResponsiveValue<Property.BorderLeftWidth>
  br?: ResponsiveValue<Property.BorderRight>
  brw?: ResponsiveValue<Property.BorderRightWidth>
  bs?: ResponsiveValue<Property.BorderWidth>
  bt?: ResponsiveValue<Property.BorderTop>
  btw?: ResponsiveValue<Property.BorderTopWidth>
  bx?: ResponsiveValue<Property.BorderLeft>
  bxw?: ResponsiveValue<Property.BorderLeftWidth>
  by?: ResponsiveValue<Property.BorderTop>
  byw?: ResponsiveValue<Property.BorderTopWidth>
}

export const borderShort = () => {
  return system({
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
}
