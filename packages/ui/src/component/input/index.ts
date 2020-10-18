import {Box} from 'src/component/box'
import {defineComponent, h, computed, ref, toRefs} from 'vue'
import styled, {Systems} from 'src/styled'
import uid from 'src/utils/uid'

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
  },
  setup(props, {attrs}) {
    const touched = ref(false)
    const value = ref(props.value)
    const previousValidateValue = ref(value.value)
    const idRef = ref(props.id)
    const _props = toRefs(props)
    const id = computed(() => getUid(idRef.value))
    return () => {
      return h(Box, {...attrs, ..._props, as: 'input', id: id.value, value: value.value}, () => {
        // console.log('render?')
        return 'fo'
      },
      )
    }
  },
})

const systems: Systems<any> = [
  {
    border: 'none',
  },
]

export const Input = styled(InputComponent, {passThrough: true})(...systems)
