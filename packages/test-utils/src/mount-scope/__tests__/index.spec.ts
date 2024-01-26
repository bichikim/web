import {mountScope} from '../'
import {onScopeDispose, reactive, ref, toRefs} from 'vue'
import {flushPromises} from '@vue/test-utils'

describe('mountScope', () => {
  it('should mount scope', async () => {
    const callback = jest.fn()
    const customComposition = () => {
      onScopeDispose(callback)
      return ref('hello')
    }
    const wrapper = mountScope(() => {
      return customComposition()
    })

    expect(wrapper.result.value).toBe('hello')
    expect(callback).toBeCalledTimes(0)
    wrapper.stop()
    await flushPromises()
    expect(callback).toBeCalledTimes(1)
  })

  it('should mount scope with reactive', () => {
    interface Props {
      message: string
    }
    const customComposition = (props: Props) => {
      const {message} = toRefs(props)
      return ref(message)
    }

    const reactiveProps = reactive({
      message: 'hello',
    })

    const wrapper = mountScope(() => {
      return customComposition(reactiveProps)
    })

    expect(wrapper.result.value).toBe('hello')

    reactiveProps.message = 'hi'

    expect(wrapper.result.value).toBe('hi')

    wrapper.result.value = 'aloha'

    expect(reactiveProps.message).toBe('aloha')
  })
})
