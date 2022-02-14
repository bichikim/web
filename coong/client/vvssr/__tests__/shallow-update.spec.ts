import {computed, defineComponent, h, reactive} from 'vue'
import {mount} from '@vue/test-utils'
import {shallowUpdate} from '../shallow-update'
import {Data} from '../types'

describe('shallowUpdate', () => {
  it('should update a reactive value', async () => {
    const Component = defineComponent({
      setup: (props) => {
        const data = reactive({
          age: 100,
          name: 'foo',
        })

        const updateData = (payload: Data) => {
          shallowUpdate(data, payload)
        }

        const age = computed(() => data.age)
        const name = computed(() => data.name)

        return (
          h('div', [
            h('div', {id: 'name'}, age.value),
            h('div', {id: 'age'}, name.value),
            h('button', {onClick: () => updateData({age: 1, name: 'bar'})}, 'update'),
          ])
        )
      },
    })
    const wrapper = mount(Component)

    expect(wrapper.get('#name').text()).toBe('foo')
    expect(wrapper.get('#age').text()).toBe('100')
  })
})
