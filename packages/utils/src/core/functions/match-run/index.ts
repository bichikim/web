export type MatchRunFuncValue<T> = (value: T) => any

export interface MatchObject<T> {
  readonly [key: string | number | symbol]: MatchRunFuncValue<T> | undefined

  readonly default?: MatchRunFuncValue<T>
}

export type MatchObjectDefault<T> = T extends {default: (...args: any) => infer R} ? R : undefined

export type MatchObjectResult<M> = M extends {
  [key: string]: (...args: any) => infer R
}
  ? R
  : unknown

export interface MatchRunner<T extends number | string | symbol> {
  <M extends MatchObject<T>>(matches: M): MatchObjectResult<M> | MatchObjectDefault<M>
}

export const match = <T extends number | string | symbol>(value: T): MatchRunner<T> => {
  return (matches: Record<any, any>) => {
    const matchedValue = matches[value]

    if (typeof matchedValue === 'function') {
      const result = matchedValue(value)

      if (result !== undefined) {
        return result as any
      }
    }

    return matches.default?.(value) as any
  }
}

/**
 * @deprecated Use `match` instead
 */
export const matchRun = match
