import {shallowUpdate, plugin as varePlugin} from 'vare'
import {Plugin, reactive} from 'vue'
import {user, UserState} from './user'
import {bucket} from './bucket'

export interface RootState {
  user?: UserState
}

export const createStore = (initialState: RootState = {}, isClient: boolean = false): {
  install: Plugin
  state: Record<string, any>
} => {
  const state = reactive({
    user,
  })

  if (isClient) {
    shallowUpdate(user, initialState.user)
  } else {
    shallowUpdate(initialState, state)
  }

  return {
    install: (app) => {
      app.use(varePlugin, {
        states: {
          bucket,
          user,
        },
      })
    },
    state,
  }
}
