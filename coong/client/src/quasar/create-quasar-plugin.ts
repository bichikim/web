export const createQuasarPlugin = async (ssrContext = {}) => {
  const {Quasar, Dark, ClosePopup} = await import('quasar')

  return (app) => {
    (Quasar.install as any)(app, {
      components: {},
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
        Dark, // Dialog, Loading, LoadingBar, Notify,
      },
    }, ssrContext)
  }
}

