import {createApp, watch} from 'vue'
import {createStoreDevTool, createVare} from 'src/store'
import {Root} from './Root'
import {useGlobal} from './store'

const app = createApp(Root)

const vare = createVare()
app.use(vare, {
  global: [useGlobal],
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
createStoreDevTool(app, [vare.manager.store, vare.localManager.store])

app.mount('#app')

