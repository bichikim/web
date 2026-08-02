/**
 * state 를 계속 들고 있다
 * @param initValue
 * @param predicate
 */
export const statefulWithArgs = <State, Args extends any[]>(
  initValue: State,
  predicate: (state: State, ...args: Args) => State,
) => {
  const update = stateful(initValue)

  return (...args: Args) => {
    return update((state) => {
      return predicate(state, ...args)
    })
  }
}

export const stateful = <State>(initValue: State) => {
  let state = initValue

  return (predicate: (state: State) => State) => {
    state = predicate(state)

    return state
  }
}
