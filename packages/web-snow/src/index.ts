import {createApp} from 'vue'
import App from './App.vue'
import '@vue/runtime-dom'

const app = createApp(App)
app.mount('#app')

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/concepts/hot-module-replacement
const hrmSnowpack = import.meta.hot
if (hrmSnowpack) {
  hrmSnowpack.accept()
  hrmSnowpack.dispose(() => {
    app.unmount()
  })
}
