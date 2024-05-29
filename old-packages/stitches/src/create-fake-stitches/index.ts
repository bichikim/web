/* eslint-disable unicorn/consistent-function-scoping */
export const createFakeStitches = () => {
  return {
    config: {},
    createTheme: () => () => ({className: '', selector: ''}),
    css: () => {
      return () => ({})
    },
    getCssText: () => '',
    globalCss: () => () => '',
    keyframes: () => () => '',
    prefix: '',
    reset: () => null,
    sheet: {},
    theme: {},
    toString: () => '',
  }
}
