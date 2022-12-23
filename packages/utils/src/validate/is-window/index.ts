export const isWindow = (value: any): value is Window => {
  const {window} = globalThis
  return window === value
}
