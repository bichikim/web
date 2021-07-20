import {boot} from 'quasar/wrappers'
import store from 'src/store'

export default boot(({app}) => {
  app.use(store as any)
})
