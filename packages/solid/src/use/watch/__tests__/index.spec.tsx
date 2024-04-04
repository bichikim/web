/**
 * @vitest-environment jsdom
 */
import flushPromises from 'flush-promises'
import {createRoot, createSignal} from 'solid-js'
import {createMutable, createStore} from 'solid-js/store'
import {describe, it, vi} from 'vitest'
import {useWatch} from '../'

describe('watch', () => {
  const mutableValue = createMutable({name: 'foo'})
  it.each([
    //
    {
      callback: (value, prevValue) => {
        expect(['bar', 'john']).toContain(value)
        expect(['bar', undefined]).toContain(prevValue)
      },
      firstValue: 'bar',
      reactiveValue: createSignal('foo'),
      secondValue: 'john',
    },
    {
      callback: (value) => {
        expect(['bar', 'john']).toContain(value)
        return (prevValue) => {
          expect(['bar', 'john']).toContain(prevValue)
        }
      },
      firstValue: 'bar',
      reactiveValue: createSignal('foo'),
      secondValue: 'john',
    },
    {
      callback: (value) => {
        expect(['bar', 'john']).toContain(value.name)
        return (prevValue) => {
          expect(['bar', 'john']).toContain(prevValue.name)
        }
      },
      clone: (value) => ({...value}),
      firstValue: {name: 'bar'},
      reactiveValue: createStore({name: 'foo'}),
      secondValue: {name: 'john'},
    },
    {
      callback: (value) => {
        expect(['bar', 'john']).toContain(value.name)
        return (prevValue) => {
          expect(['bar', 'john']).toContain(prevValue.name)
        }
      },
      clone: (value) => ({...value}),
      firstValue: {name: 'bar'},
      reactiveValue: [mutableValue, ({name}) => (mutableValue.name = name)],
      secondValue: {name: 'john'},
    },
  ])(
    'stores new state to localStorage',
    ({callback, firstValue, secondValue, reactiveValue, clone}) =>
      createRoot(async (dispose) => {
        const [state, setState] = reactiveValue as any
        const _callback = vi.fn(callback)

        setState(firstValue)
        // to catch an effect, use an effect
        useWatch(state, _callback, {clone})
        expect(_callback).not.toHaveBeenCalled()
        await flushPromises()
        expect(_callback).toHaveBeenNthCalledWith(1, firstValue, undefined)
        setState(secondValue)

        await flushPromises()

        expect(_callback).toHaveBeenNthCalledWith(2, secondValue, firstValue)

        expect(_callback).toHaveBeenCalledTimes(2)
        dispose()
      }),
  )
  it('should watch many accessors', () =>
    createRoot(async (dispose) => {
      const [state1, setState1] = createSignal('foo')
      const [state2, setState2] = createSignal('bar')
      const cleanup = vi.fn()
      const callback = vi.fn(() => cleanup)

      useWatch([state1, state2], callback)

      expect(callback).not.toHaveBeenCalled()

      setState1('foo1')

      await flushPromises()

      expect(callback).toHaveBeenNthCalledWith(1, ['foo1', 'bar'], [])

      setState2('bar1')
      await flushPromises()

      expect(callback).toHaveBeenNthCalledWith(2, ['foo1', 'bar1'], ['foo1', 'bar'])

      expect(cleanup).toHaveBeenNthCalledWith(1, ['foo1', 'bar'])

      dispose()
    }))

  // I don't know if immediate is necessary
  // It hasn't been implemented yet
  it.each([
    //
    {immediate: true},
    {immediate: false},
  ])('should watch immediately', () => {
    const callback = vi.fn()
    const {dispose, state, setState} = createRoot((dispose) => {
      const [state, setState] = createSignal('foo')

      useWatch(state, callback, {})

      expect(callback).not.toHaveBeenCalled()

      return {dispose, setState, state}
    })

    expect(callback).toHaveBeenCalled()
  })
})
