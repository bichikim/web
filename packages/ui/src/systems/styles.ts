import {
  RequiredTheme,
  ResponsiveValue,
  system,
  Theme,
  BorderProps as _BorderProps,
  borderLeft,
} from 'styled-system'
import {Property} from 'csstype'
import {SystemFunc} from '@innovirus/emotion'

export interface TextProps<T extends Theme = RequiredTheme> {
  // letterSpacing
  /**
   * css fontSize
   */
  fs?: ResponsiveValue<Property.FontSize, T>
  /**
   * css fontWeight
   */
  fw?: ResponsiveValue<Property.FontWeight, T>
  fontSize: ResponsiveValue<Property.FontSize, T>
  fontWeight: ResponsiveValue<Property.FontWeight, T>
  fontFamily?: ResponsiveValue<Property.FontFamily, T>
  textOverflow?: ResponsiveValue<Property.TextOverflow, T>
  textTransform?: ResponsiveValue<Property.TextTransform, T>
  textJustify?: ResponsiveValue<Property.TextJustify, T>
  textEmphasis?: ResponsiveValue<Property.TextEmphasis, T>
  textAnchor?: ResponsiveValue<Property.TextAnchor, T>
  textAlignLast?: ResponsiveValue<Property.TextAlignLast, T>
  textShadow?: ResponsiveValue<Property.TextShadow, T>
  textAlign?: ResponsiveValue<Property.TextAlign, T>
  lineHeight?: ResponsiveValue<Property.LineHeight, T>
  letterSpacing?: ResponsiveValue<Property.LetterSpacing, T>
  fontStyle?: ResponsiveValue<Property.FontStyle, T>
  td?: ResponsiveValue<Property.TextDecoration, T>
  textDecoration?: ResponsiveValue<Property.TextDecoration, T>
}

export const text = system<TextProps>({
  fs: {
    property: 'fontSize',
  },
  fontSize: {
    property: 'fontSize',
  },
  fontWeight: {
    property: 'fontWeight',
  },
  fw: {
    property: 'fontWeight',
  },
  fontFamily: {
    property: 'fontFamily',
  },
  textOverflow: {
    property: 'textOverflow',
  },
  textTransform: {
    property: 'textTransform',
  },
  letterSpacing: {
    property: 'letterSpacing',
  },
  textJustify: {
    property: 'textJustify',
  },
  fontStyle: {
    property: 'fontStyle',
  },
  lineHeight: {
    property: 'lineHeight',
  },
  textAlign: {
    property: 'textAlign',
  },
  textAlignLast: {
    property: 'textAlignLast',
  },
  textAnchor: {
    property: 'textAnchor',
  },
  textDecoration: {
    property: 'textDecoration',
  },
  textEmphasis: {
    property: 'textEmphasis',
  },
  textShadow: {
    property: 'textShadow',
  },
  td: {
    property: 'textDecoration',
  },
})

export interface FlexProps<T extends Theme = RequiredTheme> {
  fxa?: ResponsiveValue<Property.AlignItems, T>
  fxj?: ResponsiveValue<Property.JustifyContent, T>
  fxd?: ResponsiveValue<Property.FlexDirection, T>
  alignItems?: ResponsiveValue<Property.AlignItems, T>
  alignContent?: ResponsiveValue<Property.AlignContent, T>
  justifyContent?: ResponsiveValue<Property.JustifyContent, T>
  justifyItems?: ResponsiveValue<Property.JustifyItems, T>
  flexDirection?: ResponsiveValue<Property.FlexDirection, T>
  flexWrap?: ResponsiveValue<Property.FlexWrap, T>
  order?: ResponsiveValue<Property.Order, T>
}

export const flex = system<FlexProps>({
  fxa: {
    property: 'alignItems',
  },
  fxj: {
    property: 'justifyContent',
  },
  fxd: {
    property: 'flexDirection',
  },
  alignItems: {
    property: 'alignItems',
  },
  alignContent: {
    property: 'alignContent',
  },
  justifyContent: {
    property: 'justifyContent',
  },
  justifyItems: {
    property: 'justifyItems',
  },
  order: {
    property: 'order',
  },
  flexDirection: {
    property: 'flexDirection',
  },
  flexWrap: {
    property: 'flexWrap',
  },

})

export interface FlexItemProps<T extends Theme = RequiredTheme> {
  flexBasis?: ResponsiveValue<Property.FlexBasis, T>
  flexGrow?: ResponsiveValue<Property.FlexGrow, T>
  flexShrink?: ResponsiveValue<Property.FlexShrink, T>
  alignSelf?: ResponsiveValue<Property.AlignSelf, T>
  justifySelf?: ResponsiveValue<Property.JustifySelf, T>
  flex?: ResponsiveValue<Property.Flex, T>
}

export const flexItem = system<FlexItemProps>({
  flexBasis: {
    property: 'flexBasis',
  },
  flexGrow: {
    property: 'flexGrow',
  },
  flexShrink: {
    property: 'flexShrink',
  },
  alignSelf: {
    property: 'alignSelf',
  },
  justifySelf: {
    property: 'justifySelf',
  },
  flex: {
    property: 'flex',
  },
})

export interface DisplayProps<T extends Theme = RequiredTheme> {
  dp: ResponsiveValue<Property.Display, T>
  display: ResponsiveValue<Property.Display, T>
}

export const display = system<DisplayProps>({
  display: {
    property: 'display',
  },
  dp: {
    property: 'display',
  },
})

export interface TextShadowProps<T extends Theme = RequiredTheme> {
  textShadow: ResponsiveValue<Property.TextShadow, T>
  tsw: ResponsiveValue<Property.TextShadow, T>
}

export const textShadow = system<TextShadowProps>({
  textShadow: {
    property: 'textShadow',
  },
  tsw: {
    property: 'textShadow',
  },
})

export interface OverflowProps<T extends Theme = RequiredTheme> {
  overflow: ResponsiveValue<Property.Overflow, T>
}

export const overflow = system<OverflowProps>({
  overflow: {
    property: 'overflow',
  },
})

export interface SizeProps<T extends Theme = RequiredTheme> {
  width: ResponsiveValue<Property.Width, T>
  height: ResponsiveValue<Property.Height, T>
  minWidth: ResponsiveValue<Property.MinWidth, T>
  minHeight: ResponsiveValue<Property.MinHeight, T>
  maxWidth: ResponsiveValue<Property.MaxWidth, T>
  maxHeight: ResponsiveValue<Property.MaxHeight, T>
  size: ResponsiveValue<Property.Width, T>
}

export const size = system<SizeProps>({
  height: {
    property: 'height',
  },
  minHeight: {
    property: 'minHeight',
  },
  maxHeight: {
    property: 'maxHeight',
  },
  width: {
    property: 'width',
  },
  minWidth: {
    property: 'minWidth',
  },
  maxWidth: {
    property: 'maxWidth',
  },
  size: {
    properties: ['width', 'height'],
  },
})

export interface BoxShadowProps<T extends Theme = RequiredTheme> {
  baxShadow: ResponsiveValue<Property.BoxShadow, T>
  bsw: ResponsiveValue<Property.BoxShadow, T>
}

export const boxShadow = system<BoxShadowProps>({
  baxShadow: {
    property: 'boxShadow',
  },
  bsw: {
    property: 'boxShadow',
  },
})

export interface BorderProps<T extends Theme = RequiredTheme> extends _BorderProps {
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
  bra?: ResponsiveValue<Property.BorderRadius, T>
}

export const border = system<BorderProps>({
  borderX: {
    properties: ['borderLeft', 'borderRight'],
  },
  borderY: {
    properties: ['borderTop', 'borderBottom'],
  },
  borderWidth: {
    property: 'borderWidth',
  },
  borderTopWidth: {
    property: 'borderTopWidth',
  },
  borderBottomWidth: {
    property: 'borderBottomWidth',
  },
  borderLeftWidth: {
    property: 'borderLeftWidth',
  },
  borderRightWidth: {
    property: 'borderRightWidth',
  },
  border: {
    property: 'border',
  },
  borderStyle: {
    property: 'borderStyle',
  },
  borderTopStyle: {
    property: 'borderTopStyle',
  },
  borderBottomStyle: {
    property: 'borderBottomStyle',
  },
  borderLeftStyle: {
    property: 'borderLeftStyle',
  },
  borderRightStyle: {
    property: 'borderRightStyle',
  },
  borderRight: {
    property: 'borderRight',
  },
  borderBottom: {
    property: 'borderBottom',
  },
  borderLeft: {
    property: 'borderLeft',
  },
  borderColor: {
    property: 'borderColor',
  },
  borderTopColor: {
    property: 'borderTopColor',
  },
  borderBottomColor: {
    property: 'borderBottomColor',
  },
  borderLeftColor: {
    property: 'borderLeftColor',
  },
  borderRightColor: {
    property: 'borderRightColor',
  },
  borderRadius: {
    property: 'borderRadius',
  },
  borderTop: {
    property: 'borderTop',
  },
  borderTopLeftRadius: {
    property: 'borderTopLeftRadius',
  },
  borderTopRightRadius: {
    property: 'borderTopRightRadius',
  },
  borderBottomLeftRadius: {
    property: 'borderBottomLeftRadius',
  },
  borderBottomRightRadius: {
    property: 'borderBottomRightRadius',
  },
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
