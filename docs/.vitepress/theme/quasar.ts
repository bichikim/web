import { Quasar, Notify, Dialog, LoadingBar, Loading } from 'quasar'
import './styles/main.scss'
import './styles/quasar.variables.scss'

export function quasarPlugin(app) {
  app.use(Quasar, {
    config: {
      brand: {
        primary: '#151515',
        sunshine: '#f4f4f4',
        whiteField: '#E2E1E1',
        darkBG: '#151515',
      },
      globalProperties: {},
      screen: {
        bodyClasses: true,
      },
    },
    importStrategy: 'auto',
    plugins: {
      Notify, Dialog, LoadingBar, Loading,
    },
  })
}
