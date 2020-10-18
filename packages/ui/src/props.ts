import {
  PaddingProps,
  MarginProps,
  FlexItemProps,
  FlexProps,
  TextProps,
  SizeProps,
  ShadowProps,
  PositionProps,
  GridProps,
  BorderProps,
  ShowProps,
  ColorProps,
  BackgroundColorProps,
  DisplayProps,
} from '@/systems'

export const responsiveType = {required: false}

type PropsMember<K, V = typeof responsiveType> = Record<keyof K, V>

const paddingProps: PropsMember<PaddingProps> = {
  padding: responsiveType,
  paddingTop: responsiveType,
  paddingRight: responsiveType,
  paddingBottom: responsiveType,
  paddingLeft: responsiveType,
  paddingX: responsiveType,
  paddingY: responsiveType,
  p: responsiveType,
  pt: responsiveType,
  pr: responsiveType,
  pb: responsiveType,
  pl: responsiveType,
  px: responsiveType,
  py: responsiveType,
}

const marginProps: PropsMember<MarginProps> = {
  m: responsiveType,
  ml: responsiveType,
  mr: responsiveType,
  mt: responsiveType,
  mb: responsiveType,
  mx: responsiveType,
  my: responsiveType,
  margin: responsiveType,
  marginTop: responsiveType,
  marginRight: responsiveType,
  marginBottom: responsiveType,
  marginLeft: responsiveType,
  marginX: responsiveType,
  marginY: responsiveType,
}

const layoutProps: PropsMember<SizeProps> = {
  width: responsiveType,
  height: responsiveType,
  minWidth: responsiveType,
  minHeight: responsiveType,
  maxWidth: responsiveType,
  maxHeight: responsiveType,
  size: responsiveType,
  // overflow: responsiveType,
  // overflowX: responsiveType,
  // overflowY: responsiveType,
  // display: responsiveType,
  // verticalAlign: responsiveType,
}

const textProps: PropsMember<TextProps> = {
  fontFamily: responsiveType,
  fontSize: responsiveType,
  fontWeight: responsiveType,
  lineHeight: responsiveType,
  letterSpacing: responsiveType,
  textAlign: responsiveType,
  fontStyle: responsiveType,
  fs: responsiveType,
  fw: responsiveType,
  td: responsiveType,
  textAlignLast: responsiveType,
  textAnchor: responsiveType,
  textDecoration: responsiveType,
  textEmphasis: responsiveType,
  textJustify: responsiveType,
  textOverflow: responsiveType,
  textShadow: responsiveType,
  textTransform: responsiveType,
}

const displayProps: PropsMember<DisplayProps> = {
  display: responsiveType,
  dp: responsiveType,
}

const shadowProps: PropsMember<ShadowProps> = {
  boxShadow: responsiveType,
  textShadow: responsiveType,
}

const positionProps: PropsMember<PositionProps> = {
  position: responsiveType,
  zIndex: responsiveType,
  top: responsiveType,
  right: responsiveType,
  bottom: responsiveType,
  left: responsiveType,
}

const gridProps: PropsMember<GridProps> = {
  gridGap: responsiveType,
  gridColumnGap: responsiveType,
  gridRowGap: responsiveType,
  gridColumn: responsiveType,
  gridRow: responsiveType,
  gridAutoFlow: responsiveType,
  gridAutoColumns: responsiveType,
  gridAutoRows: responsiveType,
  gridTemplateColumns: responsiveType,
  gridTemplateRows: responsiveType,
  gridTemplateAreas: responsiveType,
  gridArea: responsiveType,
}

const flexProps: PropsMember<FlexProps> = {
  alignItems: responsiveType,
  alignContent: responsiveType,
  justifyItems: responsiveType,
  justifyContent: responsiveType,
  flexWrap: responsiveType,
  flexDirection: responsiveType,
  order: responsiveType,
  fxa: responsiveType,
  fxd: responsiveType,
  fxj: responsiveType,
}

const flexItemProps: PropsMember<FlexItemProps> = {
  flexBasis: responsiveType,
  flexGrow: responsiveType,
  flexShrink: responsiveType,
  alignSelf: responsiveType,
  justifySelf: responsiveType,
  flex: responsiveType,
}

const borderProps: PropsMember<BorderProps> = {
  border: responsiveType,
  borderWidth: responsiveType,
  borderStyle: responsiveType,
  borderColor: responsiveType,
  borderRadius: responsiveType,
  borderTop: responsiveType,
  borderTopLeftRadius: responsiveType,
  borderTopRightRadius: responsiveType,
  borderRight: responsiveType,
  borderBottom: responsiveType,
  borderBottomLeftRadius: responsiveType,
  borderBottomRightRadius: responsiveType,
  borderLeft: responsiveType,
  borderX: responsiveType,
  borderY: responsiveType,
  borderTopWidth: responsiveType,
  borderTopColor: responsiveType,
  borderTopStyle: responsiveType,
  borderBottomWidth: responsiveType,
  borderBottomColor: responsiveType,
  borderBottomStyle: responsiveType,
  borderLeftWidth: responsiveType,
  borderLeftColor: responsiveType,
  borderLeftStyle: responsiveType,
  borderRightWidth: responsiveType,
  borderRightColor: responsiveType,
  borderRightStyle: responsiveType,
  bb: responsiveType,
  bbw: responsiveType,
  bc: responsiveType,
  bl: responsiveType,
  blw: responsiveType,
  br: responsiveType,
  bra: responsiveType,
  brw: responsiveType,
  bs: responsiveType,
  bt: responsiveType,
  btw: responsiveType,
  bx: responsiveType,
  bxw: responsiveType,
  by: responsiveType,
  byw: responsiveType,
}

const showProps: PropsMember<ShowProps> = {
  show: responsiveType,
}

const colorProps: PropsMember<ColorProps> = {
  color: responsiveType,
  // backgroundColor: responsiveType,
  // bg: responsiveType,
  // opacity: responsiveType,
}

const backgroundColorProps: PropsMember<BackgroundColorProps> = {
  backgroundColor: responsiveType,
  bg: responsiveType,
}

const gapProps = {
  gap: responsiveType,
}

export const allProps = {
  ...paddingProps,
  ...marginProps,
  ...layoutProps,
  ...backgroundColorProps,
  ...shadowProps,
  ...positionProps,
  ...gridProps,
  ...borderProps,
  ...colorProps,
  ...textProps,
  ...displayProps,
  ...flexItemProps,
  ...flexProps,
  ...showProps,
  ...gapProps,
}
