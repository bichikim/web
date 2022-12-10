import * as stitches from '../'

describe('stitches', () => {
  it('should have all functions', () => {
    expect(Object.keys(stitches)).toMatchInlineSnapshot(`
      [
        "createComponentName",
        "createFakeStitches",
        "createVueStitches",
        "getClassName",
        "getDirectiveStoreKey",
        "updateClassName",
        "createStitches",
        "createTheme",
        "css",
        "defaultThemeMap",
        "globalCss",
        "keyframes",
      ]
    `)
  })
})
