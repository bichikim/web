import {flushPromises} from '@vue/test-utils'
import {ref} from 'vue-demi'
import {testUse} from './test-use'

export type TestSetup<Result extends Record<string, any>> = (props) => Result

describe('test-use', () => {
  it('should test', async () => {
    const {trigger, result} = testUse((props) => {
      const countRef = ref(0)
      return {
        count: countRef,
        foo: 'foo',
        onToggle: () => {
          countRef.value += 1
        },
      }
    })

    expect(result().foo).toBe('foo')
    expect(result().count).toBe(0)
    await trigger('toggle')
    await flushPromises()

    expect(result().count).toBe(1)
  })
})
