import {createApp} from 'vue'
import App from './App'
import router from './router'
import createEmotion from '@/lib/emotion'
import createVare from '@/lib/vare'

const emotion = createEmotion()
const vare = createVare()

createApp(App)
  .use(router)
  .use(emotion)
  .use(vare)
  .mount('#app')
