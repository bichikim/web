import {createVare} from 'vare'
import {App} from 'vue'

export const createStore = (app: App, initialState: Record<string, any> = {}) => {
  console.log(initialState)
  const vare = createVare()
  app.use(vare)

}
