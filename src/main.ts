import {createApp} from 'vue'
import App from './App'
import router from './router'
import createEmotion from '@/lib/emotion'
import createVare from '@/lib/vare'
import createTheme from '@/lib/emotion/theme'
import createFirebase from '@/plugins/firebase'

const theme = createTheme({})
const emotion = createEmotion()
const vare = createVare()
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
  .use(emotion)
  .use(theme)
  .use(firebase)
  .use(vare)
  .mount('#app')
