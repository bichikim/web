export type BooleanAttr = '' | undefined

export const booleanAttr = (value: any): BooleanAttr => {
  return value ? '' : undefined
}

export const dataAttrKey = (value: string): string => {
  return `data-${value}`
}

export const booleanTupleAttr = (tupleValue: [string, any]): [string, BooleanAttr] => {
  const [key, value] = tupleValue

  return [dataAttrKey(key), booleanAttr(value)]
}

export const dataBooleanAttrs = (value: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(value).map(([key, value]) => [`data-${key}`, booleanAttr(value)]),
  )
}
