// @refresh reload
import {mount, StartClient} from '@solidjs/start/client'
import {registerSW} from 'virtual:pwa-register'

registerSW({
  //
  onRegisteredSW(swScriptUrl, registration) {
    console.log('swScriptUrl', swScriptUrl)
    console.log('registration', registration)
  },
})

mount(() => <StartClient />, document.body)
