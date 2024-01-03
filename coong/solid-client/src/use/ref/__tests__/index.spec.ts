import {createRef, isRef} from '../'
import {createEffect, createRoot, createSignal} from 'solid-js'
import {createStore} from 'solid-js/store'
import flushPromises from 'flush-promises'

describe('createRef', () => {
  it('should create ref', async () => {
    const callback = jest.fn()
    return createRoot(async () => {
      const result = await new Promise((resolve) => {
        const [name, setName] = createSignal('')
        createEffect(() => {
          resolve(name())
        })

        setTimeout(() => {
          setName('John')
        }, 10)
      })
    })
  })
  it('should create ref', async () => {
    const callback = jest.fn()
    return createRoot((dispose) => {
      const [value, setValue] = createStore({value: 'foo'})

      createEffect(() => {
        callback(value.value)
      })

      setValue('value', () => 'bar')
      expect(value.value).toBe('bar')
      return new Promise((resolve) => {
        createEffect(() => {
          resolve(null)
          dispose()
        })
      })
    })
  })
})
