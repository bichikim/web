export const setFunctionMocks = (modules: Record<string, any>, mocker: typeof jest.fn) => {
  return Object.fromEntries(
    Object.entries(modules).map(([key, value]: any) => [
      key,
      typeof value === 'function' ? mocker(value) : value,
    ]),
  )
}
