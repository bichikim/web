import {createStoreDevTool, createVare} from 'src/simple-store'
import {createApp} from 'vue'
import {Root} from './Root'

const app = createApp(Root)

const vare = createVare()
app.use(vare)
createStoreDevTool(app, [
  {
    info: {
      kind: 'state',
    },
    store: vare.manager.store,
  },
])

app.mount('#app')
