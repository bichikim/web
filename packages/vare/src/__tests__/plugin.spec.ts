import {flushPromises} from '@vue/test-utils'
import {createApp, defineComponent, h} from 'vue-demi'
import {plugin, useVare} from '../plugin'
import {atom} from 'src/atom'

describe('plugin', () => {
  it('should use as vue plugin', async () => {
    const App = defineComponent({
      name: 'App',
      setup() {
        const {foo} = useVare()

        return () => (
          h('div', {id: 'app'}, foo.foo)
        )
      },
    })

    const element = document.createElement('div')
    element.id = 'app'
    document.body.append(element)
    const app = createApp(App)
    const foo = atom({
      foo: 'foo',
    })
    const states = {
      foo,
    }

    app.use(plugin, {provide: true, states})

    app.mount(element)
    expect(element.querySelector('#app')).toHaveTextContent('foo')
    foo.foo = 'bar'
    await flushPromises()
    expect(element.querySelector('#app')).toHaveTextContent('bar')
  })
})
