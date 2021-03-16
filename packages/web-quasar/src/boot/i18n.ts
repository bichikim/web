import {boot} from 'quasar/wrappers'
import {createI18n} from 'vue-i18n'

import messages from 'src/i18n'

const i18n = createI18n({
  locale: 'en-us',
  messages,
})

export default boot(({app}) => {
  // Set i18n instance on app
  // Temporary fix type error (quasar "app" type error)
  app.use(i18n as any)
})

export {i18n}
