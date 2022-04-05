import {createApp, watch} from 'vue'
import {createStoreDevTool, createVare} from 'src/store'
import {Root} from './Root'

const app = createApp(Root)

const vare = createVare()
app.use(vare, {
  initState: {
    john: {
      name: 'john',
    },
  },
  plugins: [
    (state) => {
      watch(state, (value) => {
        console.log(value)
      }, {
        deep: true,
      })
    },
  ],
})

app.mount('#app')

createStoreDevTool(app, [vare.manager.store, vare.localManager.store])
