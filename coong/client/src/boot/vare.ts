import {boot} from 'quasar/wrappers'
import {createStoreDevTool, createVare} from 'vare'

export default boot(({app}) => {
  const vare = createVare()
  app.use(vare as any)
  if (process.env.CLIENT) {
    createStoreDevTool(app, vare.manager.store)
  }

  // if (process.env.CLIENT) {
  //   if (process.env.MODE === 'ssr') {
  //     //
  //   }
  // }
})
