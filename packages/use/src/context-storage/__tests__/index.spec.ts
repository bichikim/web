import {mount} from '@vue/test-utils'
import {defineComponent, h} from 'vue-demi'
import {createContextStorage, useContextStorage} from '../'

describe('context-storage', () => {
  it('should set context storage', async () => {
    const contextStorage = createContextStorage()

    const Component = defineComponent({
      setup() {
        const name = useContextStorage('name', 'foo')
        const onClick = () => {
          name.value += '1'
        }
        return () => (
          h('div', {onClick}, name.value)
        )
      },
    })

    const Parent = defineComponent({
      setup() {
        contextStorage.provideStorage()
        return () => (
          h(Component)
        )
      },
    })

    const wrapper = mount(Parent)

    expect(wrapper.get('div').text()).toBe('foo')
    expect(contextStorage.storage.name).toBe('foo')
    await wrapper.get('div').trigger('click')
    expect(wrapper.get('div').text()).toBe('foo1')
    expect(contextStorage.storage.name).toBe('foo1')
  })
})
