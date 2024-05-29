import {reactiveRef} from '../'
import {reactive, watch} from 'vue'
import {flushPromises} from '@vue/test-utils'

describe('reactiveRef', () => {
  it('should return a ref', async () => {
    const callback = vi.fn()
    const data = reactive({
      name: 'foo',
    })

    const resultRef = reactiveRef(data)

    watch(resultRef, callback)

    expect(resultRef.value.name).toBe('foo')

    data.name = 'bar'

    await flushPromises()

    expect(callback).toHaveBeenCalledTimes(1)

    expect(resultRef.value.name).toBe('bar')
  })
})
