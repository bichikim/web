
export const plugin = jest.fn()
export const terser = Object.assign(jest.fn(() => plugin), {
  plugin,
})
