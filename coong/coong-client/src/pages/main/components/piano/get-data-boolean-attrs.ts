export const getDataBooleanAttr = (value: boolean) => {
  return value ? '' : undefined
}

export const getDataBooleanAttrs = (value: Record<string, boolean>) => {
  return Object.fromEntries(
    Object.entries(value).map(([key, value]) => [`data-${key}`, getDataBooleanAttr(value)]),
  )
}
