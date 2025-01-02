import {computed, reactive, ref, watch} from 'vue'
import {toReactive} from '../'
import {describe, expect, it, vi} from 'vitest'

describe('toReactive', () => {
  const setup = (target) => {
    const callback = vi.fn()
    const result = toReactive(target)

    watch(result, callback, {flush: 'sync'})

    return {
      callback,
      result,
    }
  }

  it('should return a reactive object with ref', () => {
    const foo = ref({
      name: 'foo',
    })
    const {result, callback} = setup(foo)

    expect(result.name).toBe(foo.value.name)
    foo.value = {name: 'foo1'}
    expect(result.name).toBe(foo.value.name)
    expect(callback).toHaveBeenCalledTimes(1)
  })
  it('should return a reactive object with computed', () => {
    const foo = ref({
      name: 'foo',
    })
    const computedFoo = computed(() => foo.value)
    const {result, callback} = setup(computedFoo)

    expect(result.name).toBe(foo.value.name)
    foo.value = {name: 'foo1'}
    expect(result.name).toBe(foo.value.name)
    expect(callback).toHaveBeenCalledTimes(1)
  })
  it('should return a reactive object with reactive', () => {
    const foo = reactive({
      name: 'foo',
    })
    const {result, callback} = setup(foo)

    expect(result.name).toBe(foo.name)
    foo.name = 'foo1'
    expect(result.name).toBe(foo.name)
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
