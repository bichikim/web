import {plugin as varePlugin, State, update} from 'vare'
import {Plugin} from 'vue'
import {user, UserState} from './user'

export interface RootState {
  user?: UserState
}

export const createStore = (initialState: RootState = {}): Plugin => {
  update(user, initialState.user)
  return (app) => {
    app.use(varePlugin, {
      states: {
        user,
      },
    })
  }
}
