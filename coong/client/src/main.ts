import {createApp} from './create-app'

const {app, router} = createApp()

router.isReady().then(() => {
  app.mount('#app')
})

