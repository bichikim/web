export const flipArgsFactory = <First, Rest extends unknown[], Result>(
  func: (value: First, ...args: Rest) => Result,
) => {
  return (...args: Rest) => {
    return (value: First): Result => {
      return func(value, ...args)
    }
  }
}
