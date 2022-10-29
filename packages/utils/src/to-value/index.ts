export function toValue<T extends () => any>(value: T): ReturnType<T>
export function toValue<T extends (...args: any) => any>(
  value: T,
  args: Parameters<T>,
): ReturnType<T>
export function toValue<T>(value: T): T
export function toValue(value, args?) {
  if (typeof value === 'function') {
    return (value as any)(...(args ?? []))
  }
  return value as any
}
