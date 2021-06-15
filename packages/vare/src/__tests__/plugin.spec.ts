import {flushPromises} from '@vue/test-utils'
import {createApp, defineComponent, h} from 'vue-demi'
import {plugin, useVare} from '../plugin'
import {state} from '../state'

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
    document.body.appendChild(element)
    const app = createApp(App)
    const foo = state({
      foo: 'foo',
    })
    const states = {
      foo,
    }

    app.use(plugin, {states, provide: true})

    app.mount(element)
    expect(element.querySelector('#app')).toHaveTextContent('foo')
    foo.foo = 'bar'
    await flushPromises()
    expect(element.querySelector('#app')).toHaveTextContent('bar')
  })
})
