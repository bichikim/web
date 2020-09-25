import {CSSObject} from '@styled-system/css'
import {Box} from '../component/box'
import {defineComponent, h, computed, ref, toRefs} from 'vue'
import styled, {Systems} from '../styled'
import uid from '@/lib/uid'

const getUid = (id?: string) => {
  if (typeof id === 'undefined') {
    return uid()
  }
  return id
}

export const InputComponent = defineComponent({
  name: 'b-input',
  props: {
    id: String,
  },
  setup(props, {attrs}) {
    const idRef = ref(props.id)
    const _props = toRefs(props)
    const id = computed(() => getUid(idRef.value))
    return () => {
      return h(Box, {...attrs, ..._props, as: 'input', id: id.value})
    }
  },
})

const systems: Systems = [
  {
    outline: 'none !important',
    border: 'none',
  },
]

export const Input = styled(InputComponent)(...systems)
