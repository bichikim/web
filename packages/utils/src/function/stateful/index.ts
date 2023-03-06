export const stateful = <State, Args extends unknown[]>(
  initValue: State,
  runner: (state: State, ...args: Args) => State,
) => {
  let state = initValue

  return (...args: Args) => {
    state = runner(state, ...args)
    return state
  }
}
