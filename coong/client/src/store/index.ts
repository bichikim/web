import {shallowUpdate, plugin as varePlugin} from 'vare'
import {Plugin} from 'vue'
import {posts, PostsState} from './posts'
import {user, UserState} from './user'
import {bucket} from './bucket'

export interface RootState {
  posts?: PostsState
  user?: UserState
}

export const createStore = (initialState: RootState = {}): Plugin => {
  shallowUpdate(user, initialState.user)
  return (app) => {
    app.use(varePlugin, {
      states: {
        posts,
        user,
        bucket,
      },
    })
  }
}
