import {act, state, update} from 'vare'

export interface UserState {
  email?: string
  name?: string
  token?: string
}

export const user = state<UserState>({
  // empty
})

export const setToken = act(user, (state, token) => {
  state.token = token
}, 'setToken')

export const updateUserInfo = act(user, (state, info: Omit<UserState, 'token'>) => {
  update(state, info)
}, 'updateUserInfo')
