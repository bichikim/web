import {plugin as varePlugin} from 'vare'
import {Plugin} from 'vue'

export const createStore = (initialState): Plugin => {
  return (app) => {
    app.use(varePlugin, {
      states: {},
    })
  }
}
