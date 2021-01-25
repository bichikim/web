import {createApp} from 'vue'
import App from '@/App'
import router from '@/router'
import createVare from '@winter-love/vare'
import createFirebase from '@/plugins/firebase'
import createWorkbox from '@/plugins/workbox'
import Quasar from 'quasar'
import '@vue/runtime-dom'

const vare = createVare()
const workbox = createWorkbox()
const firebase = createFirebase({
  apiKey: 'AIzaSyBvS86fzrVOx3JDZvuwWfz8embqVWVYtas',
  authDomain: 'web-prod-bc72c.firebaseapp.com',
  databaseURL: 'https://web-prod-bc72c.firebaseio.com',
  projectId: 'web-prod-bc72c',
  storageBucket: 'web-prod-bc72c.appspot.com',
  messagingSenderId: '403129900425',
  appId: '1:403129900425:web:4e316284637fd06854d558',
  measurementId: 'G-3BHD89C7XL',
})

createApp(App)
  .use(router)
  .use(workbox)
  .use(firebase)
  .use(vare)
  .use(Quasar)
  .mount('#app')
