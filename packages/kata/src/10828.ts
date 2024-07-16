export const push =
  (value: any) =>
  ([stack, print]: [any[], string[]]) => [[value, ...stack], print]
export const pop = ([stack, print]) => {
  const [value, ...rest] = stack

  if (value === undefined) {
    return [rest, [...print, '-1']]
  }

  return [rest, [...print, `${value}`]]
}

export const size = ([stack, print]: [any[], string[]]) => {
  return [stack, [...print, `${stack.length}`]]
}

export const empty = ([stack, print]: [any[], string[]]) => {
  return [stack, [...print, `${stack.length === 0 ? 1 : 0}`]]
}

export const top = ([stack, print]) => {
  const [value] = stack

  if (value === undefined) {
    return [stack, [...print, '-1']]
  }

  return [stack, [...print, `${value}`]]
}

export const pipe = (executors: ((arg: any) => any)[]) => {
  return <T>(arg: T): T => {
    let result = arg
    for (const executor of executors) {
      result = executor(result)
    }
    return result
  }
}
