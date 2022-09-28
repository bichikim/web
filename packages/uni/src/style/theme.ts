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

const {theme, styled, css, createTheme, globalCss, getCssText, keyframes} = stitches

export {theme, styled, css, createTheme, getCssText, globalCss, keyframes}

export const lightTheme = createTheme('light', {})
export const darkTheme = createTheme('dark', {
  colors: darkColors,
})

export type ThemeNames = typeof lightTheme | typeof darkTheme
