import {act, mutate, shallowUpdate, state} from 'vare'

export interface UserState {
  email?: string
  name?: string
  token?: string
}

const fakeRequest = (result) => Promise.resolve(result)

export const user = state<UserState>({
  // empty
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
})
