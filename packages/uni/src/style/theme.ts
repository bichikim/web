import {createVueStitches} from '@winter-love/stitches'
import {baseColors, colors, darkColors} from './colors'
import {radii} from './radii'

const stitches = createVueStitches({
  theme: {
    colors: {
      ...baseColors,
      ...colors,
    },
    radii,
    shadows: {
      '2xl': '0px 25px 50px -12px rgba(0, 0, 0, 0.25);',
      base: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
      inner: 'inset 0px 2px 4px rgba(0, 0, 0, 0.06);',
      lg: '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05);',
      md: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
      sm: '0px 1px 2px rgba(0, 0, 0, 0.05)',
      xl: '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
  },
  utils: {
    m: (value) => ({margin: value}),
    mb: (value) => ({marginBottom: value}),
    ml: (value) => ({marginLeft: value}),
    mr: (value) => ({marginRight: value}),
    mt: (value) => ({marginTop: value}),
    mx: (value) => ({marginLeft: value, marginRight: value}),
    my: (value) => ({marginBottom: value, marginTop: value}),
    p: (value) => ({padding: value}),
    pb: (value) => ({paddingBottom: value}),
    pl: (value) => ({paddingLeft: value}),
    pr: (value) => ({paddingRight: value}),
    pt: (value) => ({paddingTop: value}),
    px: (value) => ({paddingLeft: value, paddingRight: value}),
    py: (value) => ({paddingBottom: value, paddingTop: value}),
  },
})

export {stitches}

const {theme, styled, css, createTheme, globalCss, getCssText, keyframes} = stitches

export {theme, styled, css, createTheme, getCssText, globalCss, keyframes}

export const lightTheme = createTheme('light', {})
export const darkTheme = createTheme('dark', {
  colors: darkColors,
})

export const globalStyle = globalCss(
  {
    body: {
      fontFamily:
        "Pretendard -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI'," +
        " 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji'," +
        " 'Segoe UI Symbol', 'Noto Emoji', sans-serif",
      height: '100vh',
    },
    button: {
      all: 'unset',
    },
    html: {
      fontSize: '16px',
      height: '-webkit-fill-available',
    },
  } as any,
  {
    body: {
      height: '-webkit-fill-available',
    },
  },
)

export type ThemeNames = typeof lightTheme | typeof darkTheme
