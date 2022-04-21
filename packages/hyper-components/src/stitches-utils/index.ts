import {createGetContrastColor} from './get-contrast-color'

export const getContrastColor = createGetContrastColor({
  memo: 1000,
})

const contrastColor = (value: any) => ({
  color: getContrastColor(value),
})

const contrastBackgroundColor = (value: any) => ({
  backgroundColor: getContrastColor(value),
})

export const stitchesUtils = {
  ai: (value: any) => ({alignItems: value}),
  b: (value: any) => ({bottom: value}),
  basis: (value: any) => ({basis: value}),
  bg: (value: any) => ({backgroundColor: value}),
  bl: (value: any) => ({bottom: value, left: value}),
  br: (value: any) => ({bottom: value, right: value}),
  c: (value: any) => ({color: value}),
  cbg: contrastBackgroundColor,
  cc: contrastColor,
  contrastBackgroundColor,
  contrastColor,
  dp: (value: any) => ({display: value}),
  fd: (value: any) => ({
    display: 'flex',
    flexDirection: value,
  }),
  fit: (value: any) => ({objectFit: value}),
  grow: (value: any) => ({flexGrow: value}),
  h: (value: any) => ({height: value}),
  jc: (value: any) => ({justifyContent: value}),
  l: (value: any) => ({left: value}),
  m: (value: any) => ({margin: value}),
  maxH: (value: any) => ({maxHeight: value}),
  maxSize: (value: any) => ({
    maxHeight: value,
    maxWidth: value,
  }),
  maxW: (value: any) => ({maxWidth: value}),
  mb: (value: any) => ({marginBottom: value}),
  minH: (value: any) => ({minHeight: value}),
  minSize: (value: any) => ({
    minHeight: value,
    minWidth: value,
  }),
  minW: (value: any) => ({minWidth: value}),
  ml: (value: any) => ({marginLeft: value}),
  mr: (value: any) => ({marginRight: value}),
  mt: (value: any) => ({marginTop: value}),
  mx: (value: any) => ({marginLeft: value, marginRight: value}),
  my: (value: any) => ({marginBottom: value, marginTop: value}),
  p: (value: any) => ({padding: value}),
  pb: (value: any) => ({paddingBottom: value}),
  pl: (value: any) => ({paddingLeft: value}),
  pr: (value: any) => ({paddingRight: value}),
  ps: (value: any) => ({position: value}),
  pt: (value: any) => ({paddingTop: value}),
  px: (value: any) => ({paddingLeft: value, paddingRight: value}),
  py: (value: any) => ({paddingBottom: value, paddingTop: value}),
  r: (value: any) => ({right: value}),
  radius: (value: any) => ({borderRadius: value}),
  rb: (value: any) => ({borderBottomLeftRadius: value, borderBottomRightRadius: value}),
  rbl: (value: any) => ({borderBottomRadius: value}),
  rbr: (value: any) => ({borderBottomRight: value}),
  rt: (value: any) => ({borderTopLeftRadius: value, borderTopRightRadius: value}),
  rtl: (value: any) => ({borderBottomLeftRadius: value}),
  rtr: (value: any) => ({borderTopRightRadius: value}),
  s: (value: any) => ({fontSize: value}),
  shrink: (value: any) => ({flexShrink: value}),
  size: (value: any) => ({height: value, width: value}),
  t: (value: any) => ({top: value}),
  tl: (value: any) => ({left: value, top: value}),
  tr: (value: any) => ({right: value, top: value}),
  w: (value: any) => ({width: value}),
}
