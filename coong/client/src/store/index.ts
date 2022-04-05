import { store } from 'quasar/wrappers'
import { createVare } from 'vare'

export default store((/* { ssrContext } */) => {
  const vare = createVare()

  // You can add Pinia plugins here
  // pinia.use(SomePiniaPlugin)

  return pinia
})
