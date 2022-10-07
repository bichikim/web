import {computed as _computed, batch, effect, signal} from '@preact/signals'
import {createIsRef} from '../is-ref'
import {createWatch} from '../watch'
import {createRef} from '../ref'
import {createComputed} from '../computed'

describe('watch', () => {
  it('should watch ref', () => {
    const callback = jest.fn()
    const ref = createRef(signal)
    const isRef = createIsRef()
    const watch = createWatch(effect, isRef)

    const valueRef = ref('foo')

    watch(valueRef, (current, old) => {
      callback(current, old)
    })

    valueRef.value = 'bar'

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('bar', 'foo')
  })
  it('should watch computed ref', () => {
    const callback = jest.fn()
    const ref = createRef(signal)
    const computed = createComputed(_computed, batch)
    const isRef = createIsRef()
    const watch = createWatch(effect, isRef)

    const valueRef = ref('foo')
    const computedValue = computed(() => valueRef.value)

    watch(computedValue, (current, old) => {
      callback(current, old)
    })

    valueRef.value = 'bar'

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('bar', 'foo')
  })
  it('should watch ref with immediate', () => {
    const callback = jest.fn()
    const ref = createRef(signal)
    const isRef = createIsRef()
    const watch = createWatch(effect, isRef)

    const valueRef = ref('foo')

    watch(
      valueRef,
      (current, old) => {
        callback(current, old)
      },
      {immediate: true},
    )

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('foo', undefined)

    valueRef.value = 'bar'

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledWith('bar', 'foo')
  })
  it('should watch ref', () => {
    const callback = jest.fn()
    const ref = createRef(signal)
    const isRef = createIsRef()
    const watch = createWatch(effect, isRef)

    const fooRef = ref('foo')
    const barRef = ref('bar')

    watch(
      [fooRef, barRef],
      (current, old) => {
        callback(current, old)
      },
      {immediate: true},
    )

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(['foo', 'bar'], [])

    fooRef.value = 'foo1'

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledWith(['foo1', 'bar'], ['foo', 'bar'])
  })
})
