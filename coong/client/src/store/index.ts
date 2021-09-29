import {plugin as varePlugin, State, shallowUpdate} from 'vare'
import {Plugin} from 'vue'
import {user, UserState} from './user'

export interface RootState {
  user?: UserState
}

export const createStore = (initialState: RootState = {}): Plugin => {
  shallowUpdate(user, initialState.user)
  return (app) => {
    app.use(varePlugin, {
      states: {
        user,
      },
    })
  }
}
