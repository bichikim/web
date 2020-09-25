export const responsiveType = [String, Array, Number, Object]

export const paddingProps = {
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

export const marginProps = {
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

export const layoutProps = {
  width: responsiveType,
  height: responsiveType,
  minWidth: responsiveType,
  minHeight: responsiveType,
  maxWidth: responsiveType,
  maxHeight: responsiveType,
  size: responsiveType,
  overflow: responsiveType,
  overflowX: responsiveType,
  overflowY: responsiveType,
  display: responsiveType,
  verticalAlign: responsiveType,
}

export const typographyProps = {
  fontFamily: responsiveType,
  fontSize: responsiveType,
  fontWeight: responsiveType,
  lineHeight: responsiveType,
  letterSpacing: responsiveType,
  textAlign: responsiveType,
  fontStyle: responsiveType,
}

export const shadowProps = {
  boxShadow: responsiveType,
  textShadow: responsiveType,
}

export const positionProps = {
  position: responsiveType,
  zIndex: responsiveType,
  top: responsiveType,
  right: responsiveType,
  bottom: responsiveType,
  left: responsiveType,
}

export const gridProps = {
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

export const flexboxProps = {
  alignItems: responsiveType,
  alignContent: responsiveType,
  justifyItems: responsiveType,
  justifyContent: responsiveType,
  flexWrap: responsiveType,
  flexDirection: responsiveType,
  // item
  flex: responsiveType,
  flexGrow: responsiveType,
  flexShrink: responsiveType,
  flexBasis: responsiveType,
  justifySelf: responsiveType,
  alignSelf: responsiveType,
  order: responsiveType,
}

export const borderProps = {
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
}

export const showProps = {
  show: responsiveType,
}

export const colorProps = {
  color: responsiveType,
  backgroundColor: responsiveType,
  bg: responsiveType,
  opacity: responsiveType,
}

export const fontShortProps = {
  fs: responsiveType,
  fw: responsiveType,
}

export const textDecorationProps = {
  td: responsiveType,
  textDecoration: responsiveType,
}

export const flexShortProps = {
  fai: responsiveType,
  fji: responsiveType,
}

export const displayShortProps = {
  dp: responsiveType,
}

export const borderShortProps = {
  ba: responsiveType,
  bb: responsiveType,
  bbw: responsiveType,
  bc: responsiveType,
  bl: responsiveType,
  blw: responsiveType,
  br: responsiveType,
  brw: responsiveType,
  bs: responsiveType,
  btw: responsiveType,
  bt: responsiveType,
  bx: responsiveType,
  bxw: responsiveType,
  by: responsiveType,
  byw: responsiveType,
}

export const gapProps = {
  gap: responsiveType,
}

export const allProps = {
  ...paddingProps,
  ...marginProps,
  ...layoutProps,
  ...typographyProps,
  ...shadowProps,
  ...positionProps,
  ...gridProps,
  ...flexboxProps,
  ...borderProps,
  ...colorProps,
  ...fontShortProps,
  ...textDecorationProps,
  ...flexShortProps,
  ...displayShortProps,
  ...borderShortProps,
  ...showProps,
  // ...gapProps,
}
