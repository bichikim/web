/**
 * @jest-environment jsdom
 */
import {defineComponent, h, ref, toRef} from 'vue'
import {mount} from '@vue/test-utils'
import {inputModel, valueModel} from '../'
import {describe, expect, it} from 'vitest'

describe('v-model', () => {
  const setup = () => {
    const ModelValueComponent = defineComponent({
      emits: ['update:modelValue'],
      props: {
        modelValue: {type: String},
      },
      setup(props, {emit}) {
        const modelValueRef = toRef(props, 'modelValue')
        return () => {
          return h('div', [
            //
            h('input', {
              id: 'input-model-value',
              onInput: (event: any) => emit('update:modelValue', event?.target?.value),
              type: 'text',
              value: modelValueRef.value,
            }),
            h('span', {id: 'model-value'}, modelValueRef.value),
          ])
        }
      },
    })
    const Component = defineComponent({
      setup() {
        const inputValue = ref('foo')
        const modelValue = ref('bar')
        return () =>
          h('div', [
            //
            h('input', {id: 'input', type: 'text', ...inputModel(inputValue)}),
            h('span', {id: 'value'}, inputValue.value),
            h(ModelValueComponent, {...valueModel(modelValue)}),
          ])
      },
    })
    const wrapper = mount(Component)
    return {wrapper}
  }
  it('should render and change value', async () => {
    const {wrapper} = setup()
    expect(wrapper.get('#input').element).toHaveValue('foo')
    await wrapper.get('#input').setValue('bar')
    expect(wrapper.get('#input').element).toHaveValue('bar')
    expect(wrapper.get('#value').text()).toBe('bar')
  })
  it('should render and change modelValue', async () => {
    const {wrapper} = setup()
    expect(wrapper.get('#input-model-value').element).toHaveValue('bar')
    await wrapper.get('#input-model-value').setValue('foo')
    expect(wrapper.get('#input-model-value').element).toHaveValue('foo')
    expect(wrapper.get('#model-value').text()).toBe('foo')
  })
})
