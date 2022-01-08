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
  basis: (value: any) => ({basis: value}),
  bg: (value: any) => ({backgroundColor: value}),
  cbg: contrastBackgroundColor,
  cc: contrastColor,
  contrastBackgroundColor,
  contrastColor,
  dp: (value: any) => ({display: value}),
  fd: (value: any) => ({flexDirection: value}),
  grow: (value: any) => ({flexGrow: value}),
  jc: (value: any) => ({justifyContent: value}),
  linearGradient: (value: any) => {
    if (Array.isArray(value)) {
      const [first = '#03a9f4', second = '#f441a5'] = value
      return {
        background: `linear-gradient(90deg, ${first}, ${second}, #ffeb3b, ${first})`,
        backgroundSize: '400%',
      }
    }
    return {}
  },
  m: (value: any) => ({margin: value}),
  mb: (value: any) => ({marginBottom: value}),
  ml: (value: any) => ({marginLeft: value}),
  mr: (value: any) => ({marginRight: value}),
  mt: (value: any) => ({marginTop: value}),
  mx: (value: any) => ({marginLeft: value, marginRight: value}),
  my: (value: any) => ({marginBottom: value, marginTop: value}),
  p: (value: any) => ({padding: value}),
  pb: (value: any) => ({paddingBottom: value}),
  pl: (value: any) => ({paddingLeft: value}),
  pr: (value: any) => ({paddingRight: value}),
  pt: (value: any) => ({paddingTop: value}),
  px: (value: any) => ({paddingLeft: value, paddingRight: value}),
  py: (value: any) => ({paddingBottom: value, paddingTop: value}),
  radius: (value: any) => ({borderRadius: value}),
  rb: (value: any) => ({borderBottomLeftRadius: value, borderBottomRightRadius: value}),
  rbl: (value: any) => ({borderBottomRadius: value}),
  rbr: (value: any) => ({borderBottomRight: value}),
  rt: (value: any) => ({borderTopLeftRadius: value, borderTopRightRadius: value}),
  rtl: (value: any) => ({borderBottomLeftRadius: value}),
  rtr: (value: any) => ({borderTopRightRadius: value}),
  shrink: (value: any) => ({flexShrink: value}),
  size: (value: any) => ({height: value, width: value}),
}
