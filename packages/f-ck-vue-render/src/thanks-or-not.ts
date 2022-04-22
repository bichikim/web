
export type Action = () => boolean

export const thanksOrNot = (action: Action): 'thanks' | undefined => {
  const isDone = action()
  if (isDone) {
    return 'thanks'
  }
}

export const anyThanks = (action: Action): 'thanks' => {
  action()
  return 'thanks'
}

export interface Store {
  bananaMilk: number
  melonBread: number
}

export const purchase = (store: Store): Store => {
  if (store.melonBread > 0) {
    return {
      bananaMilk: 4,
      melonBread: 0,
    }
  }
  return {
    bananaMilk: 2,
    melonBread: 0,
  }
}
