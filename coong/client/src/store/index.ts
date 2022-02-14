import {onShouldUpdate} from '@winter-love/use'
import {shallowUpdate, plugin as varePlugin} from 'vare'
import {Plugin, reactive, watch} from 'vue'
import {user, UserState} from './user'
import {bucket} from './bucket'
import {createSoftBrowserStorage, parseJson} from '@winter-love/utils'

export interface RootState {
  user?: UserState
}

export const createStore = (initialState: RootState = {}): {
  install: Plugin
  state: Record<string, any>
} => {

  const state = reactive({
    user,
  })

  // const isClient = typeof window === 'object'
  //
  // if (isClient) {
  //   const initialState = parseJson(window.__INITIAL_STATE__, {})
  //   const localStorage = createSoftBrowserStorage<UserState>('local')
  //   const userStorageName = '__user__'
  //   shallowUpdate(user, initialState.user)
  //   shallowUpdate(user, localStorage.getItem(userStorageName))
  //   watch(user, (value) => {
  //     localStorage.setItem(userStorageName, value)
  //   })
  //   onShouldUpdate(() => {
  //     shallowUpdate(user, localStorage.getItem(userStorageName))
  //   }, {visibleDocument: true, windowFocus: true})
  //
  // } else {
  //   shallowUpdate(initialState, state)
  // }

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
