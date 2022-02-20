import {defineComponent, h, reactive, toRefs} from 'vue'
import {mount} from '@vue/test-utils'
import {shallowUpdate} from '../shallow-update'
import {Data} from '../types'

describe('shallowUpdate', () => {
  it('should update a reactive value', async () => {
    const component = defineComponent({
      setup: () => {
        const data = reactive({
          age: 100,
          name: 'foo',
        })

        const updateData = (payload: Data) => {
          shallowUpdate(data, payload)
        }

        const {age, name} = toRefs(data)

        return () => (
          h('div', [
            h('div', {id: 'name'}, name.value),
            h('div', {id: 'age'}, age.value),
            h('button', {onClick: () => updateData({age: 1, name: 'bar'})}, 'update'),
          ])
        )
      },
    })
    const wrapper = mount(component)

    expect(wrapper.get('#name').text()).toBe('foo')
    expect(wrapper.get('#age').text()).toBe('100')
  })
})
