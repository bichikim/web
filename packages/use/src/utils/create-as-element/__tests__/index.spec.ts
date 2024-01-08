/**
 * @jest-environment jsdom
 */
import {createAsElement} from '../index'
import {flushPromises, mount} from '@winter-love/test-utils'
import {defineComponent, h, ref} from 'vue'

describe('createAsElement', () => {
  it('should render a string as', async () => {
    const name = ref('foo')
    const component = defineComponent({
      setup: () => {
        return () => createAsElement('div', {style: 'color:red'}, () => name.value)
      },
    })

    const wrapper = mount(component)

    expect(wrapper.get('div').element).toHaveStyle({color: 'red'})
    await expect(wrapper.get('div').text()).toBe('foo')

    name.value = 'bar'

    await flushPromises()

    await expect(wrapper.get('div').text()).toBe('bar')
  })
  it('should render a component as', async () => {
    const name = ref('foo')
    const childrenComponent = defineComponent({
      setup: (_, {slots}) => {
        return () => h('div', slots.default?.())
      },
    })
    const component = defineComponent({
      setup: () => {
        return () => createAsElement(childrenComponent, {style: 'color:red'}, () => name.value)
      },
    })

    const wrapper = mount(component)

    expect(wrapper.get('div').element).toHaveStyle({color: 'red'})
    await expect(wrapper.get('div').text()).toBe('foo')

    name.value = 'bar'

    await flushPromises()

    await expect(wrapper.get('div').text()).toBe('bar')
  })
  it('should render with warning (original h) (check original case)', async () => {
    let _data
    jest.spyOn(console, 'warn').mockImplementationOnce((...data: any): any => {
      _data = data
    })
    const name = ref('foo')

    const MyComponent = defineComponent((_, {slots}) => {
      return () => h('div', {style: 'color:red'}, slots.defauil?.())
    })

    const component = defineComponent({
      setup: () => {
        return () => h(MyComponent, {}, name.value)
      },
    })

    const wrapper = mount(component)

    await expect(wrapper.get('div').text()).toBe('')
    expect(_data[0]).toEqual(expect.any(String))
  })
})
