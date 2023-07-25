export type BooleanAttr = '' | undefined

export const booleanAttr = (value: any): BooleanAttr => {
  return value ? '' : undefined
}
