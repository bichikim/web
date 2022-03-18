// import {quasarPlugin} from './quasar'
// import ToggleSlide from './ToggleSlide.vue'
import DefaultTheme from 'vitepress/dist/client/theme-default'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    // app.component('VueClickAwayExample', VueClickAwayExample)
    // quasarPlugin(app)
    // app.component('ToggleSlide', ToggleSlide)
  }
}
