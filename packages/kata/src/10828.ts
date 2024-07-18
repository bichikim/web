export const push =
  (value: any) =>
  ([stack, print]: [any[], string[]]): [any[], string[]] => [[value, ...stack], print]

export const pop = ([stack, print]: [any[], string[]]): [any[], string[]] => {
  const [value, ...rest] = stack

  if (value === undefined) {
    return [rest, [...print, '-1']]
  }

  return [rest, [...print, `${value}`]]
}

export const size = ([stack, print]: [any[], string[]]): [any[], string[]] => {
  return [stack, [...print, `${stack.length}`]]
}

export const empty = ([stack, print]: [any[], string[]]): [any[], string[]] => {
  return [stack, [...print, `${stack.length === 0 ? 1 : 0}`]]
}

export const top = ([stack, print]): [any[], string[]] => {
  const [value] = stack

  if (value === undefined) {
    return [stack, [...print, '-1']]
  }

  return [stack, [...print, `${value}`]]
}

export const pipe = <T>(executors: ((arg: T) => T)[]) => {
  return (arg: T): T => {
    let result = arg
    for (const executor of executors) {
      result = executor(result)
    }
    return result
  }
}
