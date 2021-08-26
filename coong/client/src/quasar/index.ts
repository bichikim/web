import {
  ClosePopup,
  Dark,
  Dialog,
  Loading,
  LoadingBar,
  Notify,
  Quasar,
} from 'quasar'

export const createQuasarPlugin = (ssrContext = {}) => (app, options = {}) => {
  (Quasar.install as any)(app, {
    config: {
      brand: {
        darkBG: '#151515',
        primary: '#151515',
        sunshine: '#f4f4f4',
        whiteField: '#E2E1E1',
      },
      globalProperties: {},
      screen: {
        bodyClasses: true,
      },
    },
    directives: {
      ClosePopup,
    },
    importStrategy: 'auto',
    plugins: {
      Dark, Dialog, Loading, LoadingBar, Notify,
    },
    ...options,
  }, ssrContext)
}
