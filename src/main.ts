import {createApp} from 'vue'
import App from './App'
import router from './router'
import createEmotion from '@/lib/emotion'
import createVare from '@/lib/vare'
import createTheme from '@/lib/emotion/theme'

const theme = createTheme({})
const emotion = createEmotion()
const vare = createVare()

createApp(App)
  .use(router)
  .use(emotion)
  .use(theme)
  .use(vare)
  .mount('#app')
