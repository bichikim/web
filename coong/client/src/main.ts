import {createApp} from 'vue'
import Root from './Root'
import {useAppModule} from './use-app-module'

const app = createApp(Root)

const {router} = await useAppModule(app, {})

await router.isReady()

app.mount('#app')
