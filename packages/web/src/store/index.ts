import {createStore} from 'vare'

const store = createStore({
  name: 'foo',
  deep: {
    name: 'foo',
  },
})

export const state = store.state

export const setName = store.mutation((state, name: string) => {
  state.name = name
})

export const setDeepName = store.mutation((state, name: string) => {
  state.deep.name = name
})

export const updateName = store.action((name: string) => {
  setName(name)
})
