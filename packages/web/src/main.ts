import {createApp} from 'vue'
import App from '@/App'
import router from '@/router'
import {createUI, createTheme} from '@winter-love/ui'
import createVare from '@winter-love/vare'
import createFirebase from '@/plugins/firebase'
import createWorkbox from '@/plugins/workbox'
import '@vue/runtime-dom'

const theme = createTheme({})
const ui = createUI()
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
  .use(ui)
  .use(workbox)
  .use(theme)
  .use(firebase)
  .use(vare)
  .mount('#app')
