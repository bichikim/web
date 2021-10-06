import {act, mutate, shallowUpdate, state, computeRef} from 'vare'

export interface UserState {
  email?: string
  name?: string
  token?: string
}

const fakeRequest = (result) => Promise.resolve(result)

export const user = state<UserState>({
  name: 'unknown',
})

export const setToken = mutate(user, (state, token) => {
  state.token = token
}, 'setToken')

export const updateUserInfo = mutate(user, (state, info: Omit<UserState, 'token'>) => {
  shallowUpdate(state, info)
}, 'updateUserInfo')

export const pullUpdateUserInfo = act(user, async () => {
  const response = await fakeRequest({
    email: 'foo@foo.net',
    name: 'foo',
  })
  updateUserInfo(response)
}, 'pullUpdateUserInfo')

export const decoName = computeRef(user, (state) => {
  return `${state.name}??`
}, 'decoName')
