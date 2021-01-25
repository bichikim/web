import workbox from '@/register-service-worker'
import {App, Plugin} from 'vue'

const createWorkbox = (): Plugin => {
  return {
    install(app: App) {
      app.config.globalProperties.$workbox = workbox
    },
  }
}

export default createWorkbox
