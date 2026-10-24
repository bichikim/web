/**
 * Compose functions: compose(f, g, h)(value) = f(g(h(value)))
 */
export const compose =
  <T>(...fns: Array<(arg: T) => T>) =>
  (value: T): T => {
    let result = value

    for (const transform of fns.toReversed()) {
      result = transform(result)
    }

    return result
  }
