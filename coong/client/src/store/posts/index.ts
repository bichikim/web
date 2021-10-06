import {atom, getter} from 'vare'

export interface Post {
  id: string
}

export interface PostsState {
  list: Post[]
}

export const posts = atom({
  foo: atom({
    bar: atom({
      name: 'bar',
    }, {
      decoName: getter((state) => `${state.name}??`),
    }),
    name: 'foo',
  }, {
    decoRootName: getter(() => `${posts.name}??`),
    setName: (state, payload: string) => {
      state.name = payload
    },
  }),
  list: [
    {id: 'foo'},
  ],
  name: 'posts',
} as PostsState, {
  addItem: (state, payload: Post) => {
    state.list.push(payload)
  },
  decoFooName: getter((state) => `${state.foo.name}??`),
  decoName: getter((state) => `${state.name}??`),
})
