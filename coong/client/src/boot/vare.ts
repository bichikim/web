import {boot} from 'quasar/wrappers'
import {createVare} from 'vare'

export default boot(({app}) => {
  const vare = createVare()
  app.use(vare)
})
