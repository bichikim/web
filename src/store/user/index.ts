import {atom} from 'vare'

export const state = atom({
  name: 'foo',
})

export const updateUserName = atom(state, (state, name: string) => {
  state.name = name
})
