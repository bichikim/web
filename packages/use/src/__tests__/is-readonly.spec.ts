import {computed, isReadonly, reactive, readonly, ref, toRef} from 'vue'

describe('is-readonly', () => {
  it('should be read-only', () => {
    const foo = ref('foo')
    expect(isReadonly(foo)).toBe(false)
    expect(isReadonly(foo.value)).toBe(false)
    const fooComputed = computed(() => foo.value)
    expect(isReadonly(fooComputed)).toBe(true)
    expect(isReadonly(fooComputed.value)).toBe(false)
    const state = reactive({
      foo: 'foo',
    })
    expect(isReadonly(state)).toBe(false)
    expect(isReadonly(state.foo)).toBe(false)
    const fooRef = toRef(state, 'foo')
    expect(isReadonly(fooRef)).toBe(false)
    const rFooRef = readonly(fooRef)
    expect(isReadonly(rFooRef)).toBe(true)
    expect(isReadonly(rFooRef.value)).toBe(false)
  })
})
