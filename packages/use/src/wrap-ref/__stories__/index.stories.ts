import {computed, h, ref} from 'vue-demi'
import {wrapRef} from '../'
import {readonlyRef} from 'src/readonly-ref'

export const Default = () => ({
  setup() {
    const fooRef = ref(0)
    const wrappedFooRef = wrapRef(fooRef)
    const unbindWrappedFooRef = wrapRef(readonlyRef(fooRef))
    const computedFoo = computed(() => {
      return fooRef.value * 2
    })
    const computedFooWrappedRef = wrapRef(computedFoo)

    return () => (
      h('div', [
        h('div', `foo ${fooRef.value}`),
        h('div', `wrapped foo${wrappedFooRef.value}`),
        h('div', `unbind wrapped foo${unbindWrappedFooRef.value}`),
        h('div', `computed foo${computedFoo.value}`),
        h('div', `computed wrapped foo${computedFooWrappedRef.value}`),
        h('button', {onClick: () => (fooRef.value += 1)}, 'increase foo'),
        h('button', {onClick: () => (wrappedFooRef.value += 1)}, 'increase wrapped foo'),
        h('button', {onClick: () => (unbindWrappedFooRef.value += 1)}, 'increase unbind wrapped foo'),
        h('button', {onClick: () => (computedFooWrappedRef.value += 1)}, 'increase computed wrapped foo'),
      ])
    )
  },
})
