export const plugin = jest.fn()

export default Object.assign(jest.fn(() => {
  return plugin
}), {
  plugin,
})
