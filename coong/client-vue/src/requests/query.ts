import {VueQueryPlugin} from '@tanstack/vue-query'
import {App} from 'vue'

export const createQuery = () => {
  return (app: App) => {
    app.use(VueQueryPlugin)
  }
}
