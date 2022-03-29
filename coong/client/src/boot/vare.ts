import {boot} from 'quasar/wrappers'
import {createVareStore} from 'vare'

export default boot(({app}) => {
  const vare = createVareStore()
  app.use(vare)
})
