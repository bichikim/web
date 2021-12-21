import {atom, getter, shallowUpdate} from 'vare'

export interface UserState {
  email?: string
  name?: string
  token?: string
}

const fakeRequest = (result) => Promise.resolve(result)

export const user = atom({
  name: 'unknown',
} as UserState, {
  decoName: getter((state) => {
    return `${state.name}??`
  }),
  pullUpdateUserInfo: async () => {
    const response = await fakeRequest({
      email: 'foo@foo.net',
      name: 'foo',
    })
    user.$.updateUserInfo(response)
  },
  setToken: (state, token: string) => {
    state.token = token
  },
  updateUserInfo: (state, info: Omit<UserState, 'token'>) => {
    shallowUpdate(state, info)
  },
})

