/**
 * state 를 계속 들고 있다
 * @param initValue
 * @param predicate
 */
export const createStateUpdaterWithArgs = <State, Args extends any[]>(
  initValue: State,
  predicate: (state: State, ...args: Args) => State,
) => {
  const update = createStateUpdater(initValue)

  return (...args: Args) => {
    return update((state) => {
      return predicate(state, ...args)
    })
  }
}

export const createStateUpdater = <State>(initValue: State) => {
  let state = initValue

  return (predicate: (state: State) => State) => {
    state = predicate(state)

    return state
  }
}

/** @deprecated Use `createStateUpdaterWithArgs` instead. */
export const statefulWithArgs = createStateUpdaterWithArgs

/** @deprecated Use `createStateUpdater` instead. */
export const stateful = createStateUpdater
