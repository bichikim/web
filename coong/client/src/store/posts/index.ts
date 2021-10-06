import {atom} from 'vare'

export interface Post {
  id: string
}

export interface PostsState {
  list: Post[]
}

export const posts = atom({
  foo: atom({
    name: 'foo',
  }, {
    setName: (state, payload: string) => {
      state.name = payload
    },
  }),
  list: [
    {id: 'foo'},
  ],
} as PostsState, {
  addItem: (state, payload: Post) => {
    state.list.push(payload)
  },
})
