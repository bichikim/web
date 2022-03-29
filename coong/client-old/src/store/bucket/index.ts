import {atom} from 'vare'

export const bucket = atom({
  name: 'foo',
})

export const setName = atom(bucket, (state, payload) => (state.name = payload))
