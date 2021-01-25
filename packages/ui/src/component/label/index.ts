import {useNamedForm} from '../form'
import {inject, defineComponent, provide, ref, toRefs, computed, readonly, h, renderSlot} from 'vue'
import {createBox} from '../box'

const labelContextSym = Symbol('label-context')

export const useLabel = () => inject(labelContextSym)

export const Label = defineComponent({
  name: 'b-label',
  props: {
    value: null,
    error: null,
    name: null,
  },
  emits: {
    input: null,
  },
  setup(props, {emit, slots}) {
    const {value, name, error} = toRefs(props)

    const {value: _value, error: _error, onChange: _onChange} = useNamedForm(name?.value)

    const valueRef = computed(() => value?.value ?? _value?.value)
    const errorRef = computed(() => error?.value ?? _error?.value)
    const onChange = (value) => {
      if (_onChange) {
        _onChange(value)
      } else {
        emit('input', value)
      }
    }

    provide(labelContextSym, readonly({
      value: valueRef,
      error: errorRef,
      onChange,
    }))

    return () => (
      h(Container, {}, slots)
    )
  },
})

const Container = createBox({
  map: {},
})
