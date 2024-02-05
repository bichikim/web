export type ConditionFunction<T> = (item: T) => boolean
export type ExecuteFunction<T> = (item: T) => unknown
export type ConditionItem<T> = [ConditionFunction<T>, ExecuteFunction<T>]

export const condition = <T>(
  ...conditions: (ConditionItem<T> | ExecuteFunction<T>)[]
) => {
  return (item: T) => {
    for (const condition of conditions) {
      if (Array.isArray(condition)) {
        const [_condition, execute] = condition

        if (_condition(item)) {
          return execute(item)
        }
      }
      if (typeof condition === 'function') {
        return condition(item)
      }
    }
  }
}
