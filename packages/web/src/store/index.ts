import {state, mutate, compute, act} from 'vare'

const foo = state({
  name: 'foo',
  deep: {
    name: 'foo',
  },
})

export const setName = mutate((name: string) => {
  foo.name = name
})

export const setDeepName = mutate((name: string) => {
  foo.deep.name = name
})

export const getDeepName = compute(() => (foo.deep.name))

export const getName = compute(() => (foo.name))

export const updateName = act((name: string) => {
  Promise.resolve().then(() => {
    setName(name)
  })
})
