import {Plugin} from 'vue'
import {createManager, managerKey, StoreManager} from './manager'

export const createVare = (): Plugin & {manager: StoreManager} => {
  const manager = createManager()
  return {
    install: (app) => {
      app.provide(managerKey, manager)
    },
    manager,
  }
}
