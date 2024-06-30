import {assignRef} from '../'
import {reactive, ref, watch} from 'vue'
import {describe, expect, it, vi} from 'vitest'

describe('assignRef', () => {
  const setup = (...args: any) => {
    const callback = vi.fn()
    const result = assignRef(...args)
    watch(result, callback, {flush: 'sync'})

    return {
      callback,
      result,
    }
  }
  it('should return reactive with many ref', () => {
    const ref1 = ref({name: 'foo'})
    const ref2 = ref({age: 10})
    const {result, callback} = setup(ref1, ref2)
    expect(result.value).toEqual({age: 10, name: 'foo'})

    ref1.value = {name: 'bar'}
    expect(callback).toHaveBeenCalledTimes(1)

    ref2.value = {age: 20}
    expect(callback).toHaveBeenCalledTimes(2)
  })
  it('should return reactive with many reactive', () => {
    const ref1 = reactive({name: 'foo'})
    const ref2 = reactive({age: 10})
    const {result, callback} = setup(ref1, ref2)
    expect(result.value).toEqual({age: 10, name: 'foo'})

    ref1.name = 'bar'
    expect(callback).toHaveBeenCalledTimes(1)

    ref2.age = 20
    expect(callback).toHaveBeenCalledTimes(2)
  })
  it('should return reactive with many ref or reactive', () => {
    const ref1 = ref({name: 'foo'})
    const ref2 = reactive({age: 10})
    const {result, callback} = setup(ref1, ref2)
    expect(result.value).toEqual({age: 10, name: 'foo'})

    ref1.value = {name: 'bar'}
    expect(callback).toHaveBeenCalledTimes(1)

    ref2.age = 20
    expect(callback).toHaveBeenCalledTimes(2)
  })
  it('should skip none object refs', () => {
    const ref1 = ref('foo')
    const ref2 = reactive({age: 10})
    const {result, callback} = setup(ref1, ref2)
    expect(result.value).toEqual({age: 10})

    ref1.value = 'bar'
    expect(callback).toHaveBeenCalledTimes(0)

    ref2.age = 20
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
