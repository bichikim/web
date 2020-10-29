import {Box} from 'src/component/box'
import {defineComponent, h, computed, ref, toRefs, watch} from 'vue'
import styled, {Systems} from 'src/styled'
import uid from 'src/utils/uid'
import {tackRefs} from 'src/utils'

const getUid = (id?: string) => {
  if (typeof id === 'undefined') {
    return uid()
  }
  return id
}

/**
 * Todo WIP
 */
export const InputComponent = defineComponent({
  name: 'b-input',
  props: {
    value: null,
    id: String,
    validates: Array,
    /**
     * 에러 발생시 값을 되돌려 놓는 여부
     */
    rollback: Boolean,
  },
  emits: {
    input: null,
    validated: null,
    touch: null,
  },
  setup(props, {attrs, emit}) {
    const touched = ref(false)
    const _value = ref<string>('')
    const value = computed(() => props.value)
    const {id, ...rest} = toRefs(props)
    const _id = computed(() => getUid(id?.value))
    watch(value, (current) => {
      _value.value = current as any
    }, {immediate: true})

    const oninput = (event) => {
      const value = event.target.value
      _value.value = value
      if (!touched.value) {
        emit('touch')
      }
      touched.value = true
      emit('input', value)
    }

    return () => {
      return h(Box, {...attrs, ...tackRefs(rest), as: 'input', id: _id.value, value: _value?.value, oninput})
    }
  },
})

const systems: Systems<any> = [
  {
    border: 'none',
  },
]

export const Input = styled(InputComponent, {passThrough: true})(...systems)
