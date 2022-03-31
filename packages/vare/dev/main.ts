import {createApp} from 'vue'
import {createStoreDevTool, createVareStore} from '../src/store'
import {Root} from './Root'

const app = createApp(Root)

const vareStore = createVareStore()
app.use(vareStore)

app.mount('#app')

createStoreDevTool(app, [vareStore.manager.storeTree, vareStore.localManager.storeTree])
